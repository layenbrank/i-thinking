import type { App } from 'vue'

import ComboboxTrigger from './components/combobox-trigger/combobox-trigger.vue'
import ReSegment from './components/re-segment/re-segment.vue'
import ScrollLandscape from './components/scroll-landscape/scroll-landscape.vue'

// export { ComboboxTrigger, ReSegment, ScrollLandscape }

export const components = {
  ReSegment,
  ScrollLandscape,
  ComboboxTrigger
}

export default {
  install(app: App) {
    Object.entries(components).forEach(([key, value]) => {
      app.component(key, value)
    })
  }
}
