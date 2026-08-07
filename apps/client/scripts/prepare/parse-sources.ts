import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  findGithubAssetUrl,
  HOST_TRIPLE,
  type ArtifactId,
  type HostKey,
  type RemoteAsset
} from './config.ts'
import { hasPath } from './file.ts'
import { log } from './log.ts'
import {
  SOURCES,
  type ArtifactSourceConfig,
  type HostMap,
  type ReleaseSpec,
  type Source,
  type SourcesFile,
  type SourcesOverride
} from './sources.ts'

type ParsedLocal = {
  type: 'local'
  id: string
  dir: string
}

type ParsedRemote = {
  type: 'remote'
  id: string
  asset: RemoteAsset
}

type ParsedSource = ParsedLocal | ParsedRemote

type ParseSourceOptions = {
  skipLocal?: boolean
}

type LocalModule = {
  default?: SourcesOverride
  SOURCES_LOCAL?: SourcesOverride
}

let hasWarnedPrepareMirrors = false
let cachedMerged: SourcesFile | null = null

function findModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url))
}

function findHostValue<T>(value: T | HostMap<T>, host: HostKey | null): T | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (!host) return null
    return (value as HostMap<T>)[host] ?? null
  }
  return value as T
}

function findArchiveName(release: ReleaseSpec, host: HostKey | null): string | null {
  return findHostValue(release.archive, host)
}

function expandDirTemplate(raw: string): string {
  const expanded = raw
    .replaceAll('${CARGO_TARGET_DIR}', process.env.CARGO_TARGET_DIR ?? '')
    .replaceAll('${HOST_TRIPLE}', HOST_TRIPLE)
  return path.normalize(expanded)
}

function normalizeMirrorBase(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function prefixUrl(base: string, canonicalUrl: string): string {
  return `${normalizeMirrorBase(base)}/${canonicalUrl}`
}

function parseEnvMirrorPrefixes(raw = process.env.PREPARE_MIRRORS): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(function (item) {
      return item.trim()
    })
    .filter(Boolean)
    .map(normalizeMirrorBase)
}

function findGithubRemoteAsset(release: ReleaseSpec, host: HostKey | null): RemoteAsset | null {
  const archiveName = findArchiveName(release, host)
  if (!archiveName) return null
  const asset: RemoteAsset = {
    archiveName,
    canonicalUrl: findGithubAssetUrl(release.repo, release.tag, archiveName)
  }
  if (release.checksum) {
    asset.checksumCanonicalUrl = findGithubAssetUrl(
      release.repo,
      release.tag,
      release.checksum.name
    )
    asset.checksumKind = release.checksum.kind
    if (release.checksum.cacheName) asset.checksumCacheName = release.checksum.cacheName
  }
  return asset
}

function injectEnvMirrors(sources: Source[]): Source[] {
  const prefixes = parseEnvMirrorPrefixes()
  if (prefixes.length === 0) return sources

  if (!hasWarnedPrepareMirrors) {
    hasWarnedPrepareMirrors = true
    log.warn(
      'PREPARE_MIRRORS 已弃用：请改为 sources.ts / sources.local.ts 中的 type:"mirror" 项'
    )
  }

  const mirrors: Source[] = prefixes.map(function (base, index) {
    return {
      type: 'mirror' as const,
      id: prefixes.length === 1 ? 'env-mirror' : `env-mirror-${index + 1}`,
      base
    }
  })

  const githubIndex = sources.findIndex(function (source) {
    return source.type === 'github'
  })
  if (githubIndex < 0) return [...mirrors, ...sources]
  return [...sources.slice(0, githubIndex), ...mirrors, ...sources.slice(githubIndex)]
}

async function loadLocalOverride(): Promise<SourcesOverride> {
  const localFile = path.join(findModuleDir(), 'sources.local.ts')
  if (!hasPath(localFile)) return {}

  try {
    const mod = (await import(pathToFileURL(localFile).href)) as LocalModule
    const override = mod.default ?? mod.SOURCES_LOCAL
    return override && typeof override === 'object' ? override : {}
  } catch (error) {
    log.warn(`加载 sources.local.ts 失败: ${error instanceof Error ? error.message : String(error)}`)
    return {}
  }
}

async function findMergedSources(): Promise<SourcesFile> {
  if (cachedMerged) return cachedMerged
  const local = await loadLocalOverride()
  const merged: SourcesFile = { ...SOURCES }
  for (const id of Object.keys(SOURCES) as ArtifactId[]) {
    const patch = local[id]
    if (!patch) continue
    merged[id] = {
      release: patch.release ?? SOURCES[id].release,
      sources: patch.sources ?? SOURCES[id].sources
    }
  }
  cachedMerged = merged
  return merged
}

function parseOneSource(
  source: Source,
  release: ReleaseSpec,
  host: HostKey | null
): ParsedSource | null {
  if (source.type === 'local') {
    const dir = expandDirTemplate(source.dir)
    if (!dir || dir.includes('${')) {
      log.debug(`跳过本地源 ${source.id}：目录模板未展开完整 (${source.dir})`)
      return null
    }
    if (!hasPath(dir)) {
      log.debug(`跳过本地源 ${source.id}：目录不存在 ${dir}`)
      return null
    }
    return { type: 'local', id: source.id, dir }
  }

  if (source.type === 'github') {
    const asset = findGithubRemoteAsset(release, host)
    if (!asset) return null
    return { type: 'remote', id: source.id ?? 'github', asset }
  }

  if (source.type === 'mirror') {
    const github = findGithubRemoteAsset(release, host)
    if (!github) return null
    const asset: RemoteAsset = {
      ...github,
      canonicalUrl: prefixUrl(source.base, github.canonicalUrl)
    }
    if (github.checksumCanonicalUrl) {
      asset.checksumCanonicalUrl = prefixUrl(source.base, github.checksumCanonicalUrl)
    }
    return { type: 'remote', id: source.id, asset }
  }

  const url = findHostValue(source.url, host)
  if (!url) return null
  let archiveName = findArchiveName(release, host)
  if (!archiveName) {
    try {
      archiveName = path.basename(new URL(url).pathname)
    } catch {
      return null
    }
  }
  const asset: RemoteAsset = {
    archiveName,
    canonicalUrl: url
  }
  const checksumUrl = source.checksumUrl ? findHostValue(source.checksumUrl, host) : null
  if (checksumUrl && release.checksum) {
    asset.checksumCanonicalUrl = checksumUrl
    asset.checksumKind = release.checksum.kind
    if (release.checksum.cacheName) asset.checksumCacheName = release.checksum.cacheName
  }
  return { type: 'remote', id: source.id, asset }
}

async function parseArtifactSources(
  artifactId: ArtifactId,
  host: HostKey | null,
  options: ParseSourceOptions = {}
): Promise<ParsedSource[]> {
  const merged = await findMergedSources()
  const config: ArtifactSourceConfig = merged[artifactId]
  const chain = injectEnvMirrors(config.sources)
  const parsed: ParsedSource[] = []

  for (const source of chain) {
    if (options.skipLocal && source.type === 'local') continue
    const item = parseOneSource(source, config.release, host)
    if (item) parsed.push(item)
  }
  return parsed
}

function formatSourceChain(sources: ParsedSource[]): string {
  if (sources.length === 0) return '(无可用源)'
  return sources
    .map(function (source) {
      return source.id
    })
    .join(' → ')
}

async function printArtifactSources(
  artifactIds: ArtifactId[],
  host: HostKey | null,
  options: ParseSourceOptions = {}
): Promise<void> {
  for (const id of artifactIds) {
    const sources = await parseArtifactSources(id, host, options)
    log.info(`${id}: ${formatSourceChain(sources)}`)
    for (const source of sources) {
      if (source.type === 'local') {
        log.debug(`  · ${source.id} local ${source.dir}`)
      } else {
        log.debug(`  · ${source.id} ${source.asset.canonicalUrl}`)
      }
    }
  }
}

async function findMergedRelease(artifactId: ArtifactId): Promise<ReleaseSpec> {
  const merged = await findMergedSources()
  return merged[artifactId].release
}

function findArchiveNameFor(artifactId: ArtifactId, host: HostKey | null): string | null {
  return findArchiveName(SOURCES[artifactId].release, host)
}

export {
  findArchiveNameFor,
  findGithubRemoteAsset,
  findMergedRelease,
  findMergedSources,
  formatSourceChain,
  parseArtifactSources,
  printArtifactSources,
  type ParsedLocal,
  type ParsedRemote,
  type ParsedSource
}
