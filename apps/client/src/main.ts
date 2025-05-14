import './styles/index.scss'
import 'ant-design-vue/dist/reset.css'

import { createApp, type Directive } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './routers/index.ts'

import { resize, debounce } from '@desktop-widgets/core/directives'

const directives: Record<string, Directive> = {
  resize,
  debounce
}

const app = createApp(App)

const pinia = createPinia()

Object.keys(directives).forEach(function (key: string) {
  app.directive(key, directives[key])
})

app
  .use(pinia)
  .use(router)

  .mount('#app')
