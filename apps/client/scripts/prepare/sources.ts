import type { ArtifactId, ChecksumKind, HostKey } from './config.ts'

type HostMap<T> = Partial<Record<HostKey, T>>

type ChecksumSpec = {
  name: string
  kind: ChecksumKind
  /** 缓存文件名；缺省 `${archive}.checksum` */
  cacheName?: string
}

/** 与取源顺序解耦的发布坐标 */
type ReleaseSpec = {
  repo: string
  tag: string
  /** 单归档名，或按 host 映射 */
  archive: string | HostMap<string>
  checksum?: ChecksumSpec
}

type LocalSource = {
  type: 'local'
  id: string
  /** 含二进制的目录；支持 ${CARGO_TARGET_DIR} ${HOST_TRIPLE} */
  dir: string
}

/** 前缀接到 release 展开的 GitHub canonical URL */
type MirrorSource = {
  type: 'mirror'
  id: string
  base: string
}

/** 完整直链备用 */
type UrlSource = {
  type: 'url'
  id: string
  url: string | HostMap<string>
  checksumUrl?: string | HostMap<string>
}

type GithubSource = {
  type: 'github'
  id?: string
}

type Source = LocalSource | MirrorSource | UrlSource | GithubSource

type ArtifactSourceConfig = {
  release: ReleaseSpec
  /** 顺序 = 优先级 */
  sources: Source[]
}

type SourcesFile = Record<ArtifactId, ArtifactSourceConfig>

/** 本机覆盖：可只改 sources / release 任一字段 */
type SourcesOverride = {
  [K in ArtifactId]?: Partial<ArtifactSourceConfig>
}

const PANDOC_VERSION = '3.10.1'

const SOURCES: SourcesFile = {
  corex: {
    release: {
      repo: 'layenbrank/corex',
      tag: 'v2.1.5',
      archive: { 'win32-x64': 'corex-v2.1.5-windows-x64.zip' },
      checksum: {
        name: 'SHA256SUMS.txt',
        kind: 'sums',
        cacheName: 'SHA256SUMS-v2.1.5.txt'
      }
    },
    sources: [{ type: 'github', id: 'github' }]
  },
  pandoc: {
    release: {
      repo: 'jgm/pandoc',
      tag: PANDOC_VERSION,
      archive: {
        'win32-x64': `pandoc-${PANDOC_VERSION}-windows-x86_64.zip`,
        'darwin-arm64': `pandoc-${PANDOC_VERSION}-arm64-macOS.zip`,
        'darwin-x64': `pandoc-${PANDOC_VERSION}-x86_64-macOS.zip`,
        'linux-x64': `pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz`,
        'linux-arm64': `pandoc-${PANDOC_VERSION}-linux-arm64.tar.gz`
      }
    },
    sources: [{ type: 'github', id: 'github' }]
  },
  ffmpeg: {
    release: {
      repo: 'BtbN/FFmpeg-Builds',
      tag: 'latest',
      archive: {
        'win32-x64': 'ffmpeg-master-latest-win64-gpl.zip',
        'linux-x64': 'ffmpeg-master-latest-linux64-gpl.tar.xz',
        'linux-arm64': 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz'
      },
      checksum: { name: 'checksums.sha256', kind: 'sums' }
    },
    sources: [{ type: 'github', id: 'github' }]
  }
}

export {
  SOURCES,
  type ArtifactSourceConfig,
  type ChecksumSpec,
  type GithubSource,
  type HostMap,
  type LocalSource,
  type MirrorSource,
  type ReleaseSpec,
  type Source,
  type SourcesFile,
  type SourcesOverride,
  type UrlSource
}
