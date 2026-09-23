import type { PlaceholderAction, PlaceholderState } from './placeholder'

/**
 * 占位区给哪些按钮：卡片墙与左栏都从这里取，免得两边各写一份、文案越走越远。
 * 差别只有标签长短（窄栏用短的），靠 `isCompact` 一档切。
 */

interface PlaceholderActionsOptions {
  isCompact?: boolean
  onNew: () => void
  onClearQuery: () => void
  onRetry: () => void
  onRefresh: () => void
}

const PLACEHOLDER_ACTIONS: Record<
  PlaceholderState,
  (options: PlaceholderActionsOptions) => PlaceholderAction[]
> = {
  loading: function () {
    return []
  },
  empty: function (options) {
    return [
      {
        label: options.isCompact ? '新增' : '新增指令',
        icon: 'mdi:plus',
        variant: 'default',
        onClick: options.onNew
      },
      { label: '重新读取', onClick: options.onRefresh }
    ]
  },
  'no-match': function (options) {
    return [{ label: '清空搜索', onClick: options.onClearQuery }]
  },
  error: function (options) {
    return [{ label: '重试', variant: 'default', onClick: options.onRetry }]
  }
}

function makePlaceholderActions(
  state: PlaceholderState,
  options: PlaceholderActionsOptions
): PlaceholderAction[] {
  return PLACEHOLDER_ACTIONS[state](options)
}

export { makePlaceholderActions }
export type { PlaceholderActionsOptions }
