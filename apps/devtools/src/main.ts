import './styles/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()

app
  .use(pinia)
  .use(router)

  .mount('#app')
