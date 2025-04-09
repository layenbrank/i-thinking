import type { RouteRecordRaw } from 'vue-router'

export default {
  path: '/',
  redirect: '/mac-view',
  children: [
    {
      path: '/base-view',
      name: 'base-view',
      component: () => import('@/views/BaseView.vue')
    },
    {
      path: '/mac-view',
      name: 'mac-view',
      component: () => import('@/views/MacView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
} as RouteRecordRaw
