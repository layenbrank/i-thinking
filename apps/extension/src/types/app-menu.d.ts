export type ContextMenuMap = Readonly<Partial<Record<ContextMenuKeys, () => void>>>

export interface MenuOptions {
	label: string
	key: ContextMenuKeys
	icon: Component | string
}

export type ContextMenuKeys =
	| 'update-app'
	| 'update-wallpaper'
	| 'update-backup'
	| 'update-layouts'
	| 'update-size'
	| 'update-settings'
