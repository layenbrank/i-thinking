# Findings — 还原 type: commonjs

## 决策
- `"type": "module"` 与 Forge 默认 CJS main / Electron 启动不兼容（实践中无法稳定启动）
- 还原 `"type": "commonjs"`，Main 交回 Forge 默认 CJS

## 变更
- [`package.json`](package.json)：`type: commonjs`
- [`vite.main.config.ts`](vite.main.config.ts)：去掉 ESM `build.lib`
- [`postcss.config.js`](postcss.config.js)：`module.exports`
- [`sidecar/scripts/package.json`](sidecar/scripts/package.json)：局部 `type: module`，便于 `node build.ts`

## 保留
- `sidecar/scripts/build.ts`（非 .mjs）
- `make`/`package` 不内联 sidecar verify
