import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Widget } from '../types/widget'

export const useWidgetStore = defineStore(
  'widgets',
  () => {
    const widgets = ref<Widget[]>([])

    function addWidget(widget: Widget) {
      widgets.value.push(widget)
    }

    function updateWidget(id: string, updates: Partial<Widget>) {
      const index = widgets.value.findIndex((w) => w.id === id)
      if (index > -1) {
        widgets.value[index] = { ...widgets.value[index], ...updates }
      }
    }

    function removeWidget(id: string) {
      widgets.value = widgets.value.filter((w) => w.id !== id)
    }

    return {
      widgets,
      addWidget,
      updateWidget,
      removeWidget
    }
  }
  // ,
  // {
  //   persist: {
  //     key: 'desktop-widgets-widgets',
  //     storage: localStorage,
  //     paths: ['widgets']
  //   }
  // }
)
