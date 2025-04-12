import { ref } from "vue";
import { defineStore } from "pinia";
import { themes } from "../types/theme";
export const useThemeStore = defineStore("theme", () => {
    const currentTheme = ref("purple");
    function setTheme(theme) {
        currentTheme.value = theme;
    }
    function getTheme() {
        return themes[currentTheme.value];
    }
    return {
        currentTheme,
        setTheme,
        getTheme,
    };
});
//# sourceMappingURL=theme.js.map