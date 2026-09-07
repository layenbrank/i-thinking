import type { GnProfile } from '../types.ts'

const DevGnProfile: GnProfile = {
  id: 'dev',
  description: '本地 component 开发构建（gn/args.gn）',
  argsFile: 'args.gn'
}

const ReleaseGnProfile: GnProfile = {
  id: 'release',
  description: '官方发布构建（gn/args.release.gn + 可选 local）',
  argsFile: 'args.release.gn',
  localArgsFile: 'args.release.local.gn'
}

const GN_PROFILES: Record<string, GnProfile> = {
  dev: DevGnProfile,
  release: ReleaseGnProfile
}

function findGnProfile(id: string): GnProfile {
  const profile = GN_PROFILES[id]
  if (!profile) {
    throw new Error(`[browser] 未知 GN profile: ${id}（${Object.keys(GN_PROFILES).join('|')}）`)
  }
  return profile
}

export { DevGnProfile, GN_PROFILES, ReleaseGnProfile, findGnProfile }
