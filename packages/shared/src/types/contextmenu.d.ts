type ContextMenuMap = Readonly<Partial<Record<ContextMenuKeys, () => void>>>

interface ContextMenuOptions {
  label: string
  key: ContextMenuKeys
  icon: Component | string
}

type ContextMenuKeys =
  | 'update-app'
  | 'remove-app'
  | 'update-wallpaper'
  | 'update-backup'
  | 'update-layouts'
  | 'update-size'
  | 'update-settings'
