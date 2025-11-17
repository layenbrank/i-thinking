import type { RouteRecordRaw } from 'vue-router'

export default {
	path: '/',
	redirect: '/intelligence-view',
	children: [
		{
			path: '/mac-view',
			name: 'mac-view',
			component: () => import('@/views/mac-view.vue')
		},
		{
			path: '/upload-view',
			name: 'upload-view',
			component: () => import('@/views/upload-view.vue')
		},
		{
			path: '/wasm-view',
			name: 'wasm-view',
			component: () => import('@/views/wasm-view.vue')
		},
		{
			path: '/clipchamp-view',
			name: 'clipchamp-view',
			component: () => import('@/views/clipchamp-view.vue')
		},
		{
			path: '/intelligence-view',
			name: 'intelligence-view',
			component: () => import('@/views/demo/intelligence-view.vue')
		},
		// {
		// 	path: '/intelligence-view',
		// 	name: 'intelligence-view',
		// 	component: () => import('@/views/intelligence-view.vue')
		// },
		{
			path: '/iframe-view',
			name: 'iframe-view',
			component: () => import('@/views/demo/iframe-view.vue')
		},
		// {
		// 	path: '/iframe-view',
		// 	name: 'iframe-view',
		// 	component: () => import('@/views/iframe-view.vue')
		// },
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('@/views/not-found-view.vue')
		}
	]
} as RouteRecordRaw
