import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

// 定义常量
const FONT_EXTENSIONS = new Set([".woff", ".woff2", ".ttf", ".otf"]);

export default defineConfig(function () {
  console.log(resolve(__dirname, "src/index.ts"));
  return {
    plugins: [
      vue(),
      dts({
        outDir: "./dist/types",
      }),
    ],
    build: {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "@desktop-widgets/shared",
        fileName: "shared",
        formats: ["es"],
      },
    },
  };
});
