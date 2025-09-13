import locale from '@/plugins/locale.ts'
import preload from '@/plugins/preload.ts'
import '@/styles/index.scss'
import { debounce, resize } from '@desktop-app/core/directives'
import 'ant-design-vue/dist/reset.css'
import { createPinia } from 'pinia'
import 'reflect-metadata'
import { createApp, type Directive } from 'vue'
import App from './App.vue'
import router from './router/index.ts'

const directives: Record<string, Directive> = {
	resize,
	debounce
}

const app = createApp(App)

const pinia = createPinia()

for (const [key, directive] of Object.entries(directives)) {
	if (!directive) continue
	app.directive(key, directive)
}

app
	.use(pinia)
	.use(router)
	.use(preload)
	.use(locale)

	.mount('#app')
