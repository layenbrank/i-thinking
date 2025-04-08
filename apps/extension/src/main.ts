import './styles/index.scss'

import { createApp, type Directive } from 'vue'
import { createPinia } from 'pinia'

// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'

import { resize, debounce } from '@desktop-widgets/core'

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
