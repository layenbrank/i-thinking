import type { RouteRecordRaw } from 'vue-router'

export default {
  path: '/',
  redirect: '/home',
  children: [
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
  ],
} as RouteRecordRaw
