import { ref } from "vue";
import { defineStore } from "pinia";
export const useWidgetStore = defineStore("widgets", () => {
    const widgets = ref([]);
    function addWidget(widget) {
        widgets.value.push(widget);
    }
    function updateWidget(id, updates) {
        const index = widgets.value.findIndex((w) => w.id === id);
        if (index > -1) {
            widgets.value[index] = { ...widgets.value[index], ...updates };
        }
    }
    function removeWidget(id) {
        widgets.value = widgets.value.filter((w) => w.id !== id);
    }
    return {
        widgets,
        addWidget,
        updateWidget,
        removeWidget,
    };
});
//# sourceMappingURL=widgets.js.map