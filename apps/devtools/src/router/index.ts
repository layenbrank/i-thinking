import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const modules: Record<string, { default: RouteRecordRaw }> = import.meta.glob(
  ['./modules/**/*.ts'],
  {
    eager: true
  }
)

const routes: RouteRecordRaw[] = []

Object.keys(modules).forEach(key => {
  routes.push(modules[key].default)
})

const router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router
