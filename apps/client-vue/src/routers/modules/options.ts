import type { RouteRecordRaw } from 'vue-router'

export default {
	path: '/',
	redirect: '/:pathMatch(.*)*',
	children: [
		{
			path: '/work-view',
			name: 'work-view',
			component: () => import('@/views/work-view/work-view.vue'),
			children: [
				{
					path: '/work-view/monitor-changes',
					name: 'monitor-changes',
					component: () => import('@/views/work-view/monitor-changes.vue')
				},
				{
					path: '/work-view/generate-path',
					name: 'generate-path',
					component: () => import('@/views/work-view/generate-path.vue')
				}
			]
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('@/views/not-found-view.vue')
		}
	]
} as RouteRecordRaw
