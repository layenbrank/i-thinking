import './styles/index.scss'
import 'ant-design-vue/dist/reset.css'

import { createApp, type Directive } from 'vue'
import { createPinia } from 'pinia'

// import 'virtual:svg-icons-register'
import 'reflect-metadata'
import { resize, debounce } from '@desktop-widgets/core/directives'

const directives: Record<string, Directive> = {
  resize,
  debounce
}

import App from './App.vue'
import router from './router/index.ts'

const app = createApp(App)

const pinia = createPinia()

for (const key in Object.keys(directives)) {
  if (!Object.prototype.hasOwnProperty.call(directives, key)) continue
  const directive = directives[key]
  app.directive(key, directive)
}

app
  .use(pinia)
  .use(router)

  .mount('#app')
