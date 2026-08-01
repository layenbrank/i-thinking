type FeatureBucket =
  | 'all'
  | 'schedule'
  | 'notes'
  | 'media'
  | 'dev'
  | 'apps'
  | 'system'

type FeatureBucketOption = {
  label: string
  value: FeatureBucket
}

const FEATURE_BUCKETS: FeatureBucketOption[] = [
  { label: '全部', value: 'all' },
  { label: '日程', value: 'schedule' },
  { label: '笔记', value: 'notes' },
  { label: '媒体', value: 'media' },
  { label: '开发', value: 'dev' },
  { label: '应用', value: 'apps' },
  { label: '系统', value: 'system' }
]

const COMPONENT_BUCKET: Partial<Record<MagneticTile.Component, Exclude<FeatureBucket, 'all'>>> = {
  calendar: 'schedule',
  clock: 'schedule',
  countdown: 'schedule',
  bookmark: 'notes',
  markdown: 'notes',
  signboard: 'notes',
  clipchamp: 'media',
  gallery: 'media',
  screenshot: 'media',
  morph: 'media',
  code: 'dev',
  developer: 'dev',
  example: 'dev',
  collection: 'apps',
  marketplace: 'apps',
  settings: 'system',
  intelligence: 'system'
}

function findFeatureBucket(component: MagneticTile.Component): Exclude<FeatureBucket, 'all'> {
  return COMPONENT_BUCKET[component] ?? 'system'
}

function matchFeatureBucket(tile: Pick<MagneticTile, 'component'>, bucket: FeatureBucket) {
  if (tile.component === 'navigation') return false
  if (bucket === 'all') return true
  return findFeatureBucket(tile.component) === bucket
}

function findBucketLabel(bucket: FeatureBucket) {
  const option = FEATURE_BUCKETS.find(function (item) {
    return item.value === bucket
  })
  return option?.label ?? '全部'
}

export { FEATURE_BUCKETS, findBucketLabel, findFeatureBucket, matchFeatureBucket }
export type { FeatureBucket, FeatureBucketOption }
