import { ref } from "vue";
import { defineStore } from "pinia";
import type { ThemeColor } from "../types/theme";
import { themes } from "../types/theme";

export const useThemeStore = defineStore(
  "theme",
  () => {
    const currentTheme = ref<ThemeColor>("purple");

    function setTheme(theme: ThemeColor) {
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
  },
  // ,
  // {
  //   persist: {
  //     key: 'desktop-widgets-theme',
  //     storage: localStorage,
  //     paths: ['currentTheme']
  //   }
  // }
);
