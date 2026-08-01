const TILE_HINTS: Partial<Record<MagneticTile.Component, string>> = {
  bookmark: '收藏常用链接与站点入口',
  calendar: '日程安排与宜忌参考',
  clock: '数字与指针时钟样式',
  countdown: '目标日倒数与进度',
  code: '代码片段浏览与编辑',
  clipchamp: '视频剪辑快捷入口',
  collection: '应用集合分组管理',
  marketplace: '发现并添加更多磁贴',
  markdown: '备忘录与 Markdown 笔记',
  morph: '形态变换与视觉实验',
  settings: '应用偏好与系统设置',
  intelligence: 'AI Hub 智能助手',
  developer: '开发者工具与调试',
  gallery: '图库浏览与管理',
  signboard: '看板任务与状态流转',
  screenshot: '截屏与标注工具',
  example: '示例磁贴与演示'
}

function findTileHint(component: MagneticTile.Component, fallback: string) {
  return TILE_HINTS[component] ?? fallback
}

export { TILE_HINTS, findTileHint }
