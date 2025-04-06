import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(function () {
  console.log(resolve(__dirname, "src/index.ts"));
  return {
    plugins: [
      vue(),
      vueJsx(),
      dts({
        outDir: "./dist/types",
      }),
    ],
    build: {
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "@desktop-widgets/core",
        fileName: "index",
        formats: ["es"],
      },
      rollupOptions: {
        external: ["vue", "pinia"],
        output: {
          exports: "named",
          globals: {
            vue: "Vue",
            pinia: "Pinia",
          },
        },
      },
    },
  };
});
