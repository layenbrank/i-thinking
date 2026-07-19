# Progress: Studio 企业级重构

## Code review hardening (done)
- IPC: webContents 白名单 + Vite origin / file: 校验
- before-quit: 等待 module.dispose 再 exit
- APP_ROOT: app.getAppPath()
- Fuses: RunAsNode/NodeOptions/Inspect 关闭
- tsconfig 按 main/preload/renderer 拆分；去掉 @renderer；删空目录
- Tests 10 passed；package OK
