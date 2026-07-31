import { addCollection } from '@iconify/vue/offline'
import App from '@/App.vue'
import locale from '@/plugins/locale.ts'
import preload from '@/plugins/preload.ts'
import router from '@/router/index.ts'
import { debounce, resize } from '@i-thinking/directives'
import AntDesignIconify from '@iconify/json/json/ant-design.json'
import MDIconify from '@iconify/json/json/mdi.json'
import CustomIconify from '@i-thinking/shared/iconify.json'
import { createPinia } from 'pinia'
import { createApp, type Directive } from 'vue'

import 'reflect-metadata'

import '@/styles/index.scss'
import 'ant-design-vue/dist/reset.css'

addCollection(AntDesignIconify)
addCollection(MDIconify)
addCollection(CustomIconify)

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
