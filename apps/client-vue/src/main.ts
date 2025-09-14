import 'ant-design-vue/dist/reset.css'
import './styles/index.scss'

import { createPinia } from 'pinia'
import { createApp, type Directive } from 'vue'

import App from './App.vue'
import router from './routers/index.ts'

import { debounce, resize } from '@desktop-app/core/directives'

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

	.mount('#app')
