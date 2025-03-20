import pluginVue from "eslint-plugin-vue";

import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import oxlint from "eslint-plugin-oxlint";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
import { configureVueProject } from "@vue/eslint-config-typescript";
configureVueProject({ scriptLangs: ["ts", "tsx"] });
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  oxlint.configs["flat/recommended"],
  skipFormatting,
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
  }
);
