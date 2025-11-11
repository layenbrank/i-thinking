import type { App } from 'vue'

import ComboboxTrigger from './components/combobox-trigger/combobox-trigger.vue'
import ReSegment from './components/re-segment/re-segment.vue'
import ScrollbarX from './components/scrollbar-x/scrollbar-x.vue'

export { ComboboxTrigger, ReSegment, ScrollbarX }

const components = {
	ReSegment,
	ScrollbarX,
	ComboboxTrigger
}

export default {
	install(app: App) {
		Object.entries(components).forEach(([key, value]) => {
			app.component(key, value)
		})
	}
}
