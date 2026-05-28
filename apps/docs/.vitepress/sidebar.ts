import type { DefaultTheme } from 'vitepress'
export default {
	'/packages/': [
		{
			text: '@ngify/http',
			base: '/packages/ngify-http',
			collapsed: false,
			items: [
				{
					text: 'ngify-http',
					link: '/ngify-http.md'
				}
			]
		},
		{
			text: 'core',
			base: '/packages/core',
			collapsed: false,
			items: [
				{
					text: 'core',
					link: '/core.md'
				}
			]
		},
		{
			text: 'shared',
			base: '/packages/shared',
			collapsed: false,
			items: [
				{
					text: 'shared',
					link: '/shared.md'
				}
			]
		},
		{
			text: 'ui',
			base: '/packages/ui',
			collapsed: false,
			items: [
				{
					text: 'ui',
					link: '/ui.md'
				}
			]
		}
	],
	'/configs/': [
		{
			text: 'vite',
			base: '/configs/vite',
			collapsed: false,
			items: [
				{
					text: 'vite',
					link: '/vite.md'
				}
			]
		}
	],
	'/guides/': [
		{
			text: 'React',
			collapsed: false,
			items: [
				{
					text: 'Zustand 使用指南',
					link: '/guides/zustand'
				}
			]
		}
	]
} as DefaultTheme.SidebarMulti
