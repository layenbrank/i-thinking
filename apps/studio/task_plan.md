# Task Plan — 还原 type: commonjs

## Goal
`type: module` 导致 Electron 无法启动；还原为 `commonjs`，并回退相关 Vite / PostCSS / 文档。

## Tasks
- [x] package.json → `"type": "commonjs"`
- [x] vite.main.config.ts 去掉 ESM `build.lib`，恢复 Forge 默认 CJS
- [x] postcss.config.js → `module.exports`
- [x] sidecar/scripts：本地 `package.json` type module，保证 `build.ts` 仍可用 node 执行
- [x] 同步 docs + findings/progress
- [x] sidecar:verify 通过

## Errors
| Error | Resolution |
|-------|------------|
| type:module + CJS/ESM 入口冲突无法启动 | 还原 commonjs |
