import '@/styles/index.scss'
import 'ant-design-vue/dist/reset.css'

import { createPinia } from 'pinia'
import { createApp, type Directive } from 'vue'

import preload from '@/plugins/preload.ts'
import { debounce, resize } from '@desktop-app/core/directives'
import 'reflect-metadata'

const directives: Record<string, Directive> = {
	resize,
	debounce
}

import App from './App.vue'
import router from './router/index.ts'

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

	.mount('#app')
