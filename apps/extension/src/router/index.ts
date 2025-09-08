import {
	createWebHashHistory as defineHistory,
	createRouter as defineRouter,
	type RouteRecordRaw
} from 'vue-router'

const modules: Record<string, { default: RouteRecordRaw }> = import.meta.glob(
	['./modules/**/*.ts'],
	{
		eager: true
	}
)

const routes: RouteRecordRaw[] = []

Object.keys(modules).forEach(function (key) {
	const module = modules[key]
	if (!module) return
	routes.push(module.default)
})

const router = defineRouter({
	history: defineHistory(import.meta.env.BASE_URL),
	scrollBehavior() {
		return {
			left: 0,
			top: 0
		}
	},
	routes
})

export default router
