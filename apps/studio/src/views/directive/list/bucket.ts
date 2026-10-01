import { BUCKETS, BucketSchema } from '@/shared/ipc/specs/sidecar'
import type { Bucket, DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import type { DirectiveGroup } from './types'

interface BucketMark {
  label: string
  icon: string
  /**
   * 图标底色：只给「扫一眼认分类」用，饱和度压得很低。
   * 状态色（成功/失败/运行中）仍只出现在左缘与徽标上，互不抢。
   */
  tile: string
}

const BUCKET_LABELS: Record<Bucket, string> = {
  system: '系统',
  network: '网络',
  data: '数据',
  ui: '界面',
  logic: '逻辑',
  plugin: '插件'
}

/** 离线 Iconify 图标名，集合在 renderer 里 addCollection */
const BUCKET_ICONS: Record<Bucket, string> = {
  system: 'mdi:cog-outline',
  network: 'mdi:web',
  data: 'mdi:database-outline',
  ui: 'mdi:monitor',
  logic: 'mdi:code-braces',
  plugin: 'mdi:puzzle-outline'
}

/**
 * 分类色只染图标块（参考快捷指令的圆角色块），不用来铺卡片背景。
 * 避开 destructive / chart-2（成功绿），免得和运行状态撞色。
 */
const BUCKET_TILES: Record<Bucket, string> = {
  system: 'bg-secondary text-secondary-foreground',
  network: 'bg-primary/12 text-primary',
  data: 'bg-chart-3/18 text-chart-3',
  ui: 'bg-chart-1/15 text-chart-1',
  logic: 'bg-chart-4/22 text-foreground',
  plugin: 'bg-chart-5/18 text-chart-5'
}

/** corex 没给分类（或分类读不出来）的那一组 */
const OTHER_LABEL = '其他'
const OTHER_ICON = 'mdi:file-outline'
const OTHER_KEY = 'other'
const OTHER_TILE = 'bg-muted text-muted-foreground'

const OTHER: Bucket | null = null

/** 是不是在册的分类 —— 卡片、分组、编辑器判定「有没有分类」都走它 */
function isBucket(value: string | null | undefined): value is Bucket {
  return BUCKETS.includes(value as Bucket)
}

/**
 * 分类 → 列表里用的标记（图标 + 名称 + 色块）。corex 没写分类时用「其他」的那套，
 * 不能顺手算成 plugin —— 那会让卡片显示的图标和它所属的分组对不上。
 */
function findBucketMark(bucket: string | null | undefined): BucketMark {
  if (isBucket(bucket)) {
    return { label: BUCKET_LABELS[bucket], icon: BUCKET_ICONS[bucket], tile: BUCKET_TILES[bucket] }
  }
  return { label: OTHER_LABEL, icon: OTHER_ICON, tile: OTHER_TILE }
}

/** 解析 corex 写下的分类：不认识的写法算「未分类」，不替它编一个。 */
function parseBucket(value: string): Bucket | undefined {
  const parsed = BucketSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** 按分类分组，顺序固定为 `BUCKETS`，没分类的排最后；空组不出现。 */
function groupByBucket(entries: readonly DirectiveEntry[]): DirectiveGroup[] {
  const groups = new Map<Bucket | null, DirectiveGroup>()
  BUCKETS.forEach(function (bucket) {
    groups.set(bucket, {
      key: bucket,
      label: BUCKET_LABELS[bucket],
      icon: BUCKET_ICONS[bucket],
      items: []
    })
  })
  groups.set(OTHER, { key: OTHER_KEY, label: OTHER_LABEL, icon: OTHER_ICON, items: [] })

  entries.forEach(function (entry) {
    // 认不出的分类落进「其他」，不能在这里丢掉 —— 条目凭空消失比归错组更难查
    const group = groups.get(isBucket(entry.bucket) ? entry.bucket : OTHER)
    if (group) group.items.push(entry)
  })

  return [...groups.values()].filter(function (group) {
    return group.items.length > 0
  })
}

export {
  BUCKET_ICONS,
  BUCKET_LABELS,
  BUCKET_TILES,
  BUCKETS,
  findBucketMark,
  groupByBucket,
  parseBucket
}
export type { Bucket, BucketMark }
