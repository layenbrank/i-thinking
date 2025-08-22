import type { RouteRecordRaw } from 'vue-router'

export default {
	path: '/',
	redirect: '/mac-view',
	children: [
		{
			path: '/base-view',
			name: 'base-view',
			component: () => import('@/views/base-view.vue')
		},
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
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('@/views/not-found-view.vue')
		}
	]
} as RouteRecordRaw
