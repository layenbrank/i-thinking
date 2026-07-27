import type { MenuItem, MenuItemKind, ParsedMenuItem } from '@/components/contextmenu/types'

function parseItemKind(item: MenuItem): MenuItemKind {
  if (item.type) return item.type
  if (item.children && item.children.length > 0 && item.label && !item.key) {
    return 'group'
  }
  return 'item'
}

function parseMenuItems(items: MenuItem[], pathPrefix = ''): ParsedMenuItem[] {
  return items.map(function (item, index) {
    const kind = parseItemKind(item)
    const key =
      item.key ??
      (kind === 'divider' ? `${pathPrefix}divider-${index}` : `${pathPrefix}item-${index}`)
    const children = item.children ? parseMenuItems(item.children, `${key}.`) : undefined

    return {
      ...item,
      key,
      type: kind,
      children
    }
  })
}

function findFocusable(items: ParsedMenuItem[]): ParsedMenuItem[] {
  const result: ParsedMenuItem[] = []

  function walk(nodes: ParsedMenuItem[]) {
    for (const node of nodes) {
      if (node.type === 'divider') continue
      if (node.type === 'group') {
        if (node.children) walk(node.children)
        continue
      }
      if (!node.disabled) result.push(node)
    }
  }

  walk(items)
  return result
}

function hasChildren(item: ParsedMenuItem) {
  return Boolean(item.children && item.children.length > 0)
}

export { parseMenuItems, findFocusable, hasChildren }
