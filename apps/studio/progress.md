# Progress — 还原 type: commonjs

## Done
- package.json → commonjs
- vite.main.config.ts 恢复 Forge 默认 CJS
- postcss.config.js → module.exports
- sidecar/scripts/package.json（局部 ESM，供 build.ts）
- docs：packaging / troubleshooting / architecture / examples

## Verify
| 检查 | 结果 |
|------|------|
| sidecar:verify（node build.ts） | ✓ |
| package / 启动 | 待用户确认 |
