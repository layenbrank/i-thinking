# 与 apps/studio 的关系

| | `apps/studio` | `apps/browser` |
|--|---------------|----------------|
| 运行时 | Electron | Chromium fork |
| 内容 | 桌面应用壳与业务 UI | 浏览器产品：WebUI、`chrome://i-thinking`、内核补丁 |
| 本机大目录 | 无 | `D:\i-thinking-browser\` |

两边可并存；内核与 `depot_tools` / Chromium 源码只由 `apps/browser` 管理。

路径与命令见 [../README.md](../README.md)、[03-directories.md](./03-directories.md)。
