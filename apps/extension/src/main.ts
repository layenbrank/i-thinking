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

Object.keys(directives).forEach((key: string) => {
  app.directive(key, (directives as { [key: string]: Directive })[key])
})

app
  .use(pinia)
  .use(router)

  .mount('#app')
