# i-thinking 品牌相关 Chromium 改动清单

产品名：**i-thinking**。用户数据目录名与 `config.json` 的 `userDataDirName` 一致。以下为常见需改文件（路径相对 `CHROMIUM_ROOT`）；具体符号随里程碑变化，以树内 branding / install_static 为准。

## 产品名与显示字符串

| 文件 / 区域 | 改动要点 |
|-------------|----------|
| `chrome/app/theme/*/BRANDING` 或 `chrome/app/chromium_strings.grd` | 短名、产品名改为 i-thinking |
| `chrome/app/generated_resources.grd`（及 locale） | UI 可见「Chromium」文案 |
| `components/components_chromium_strings.grd` | 组件层品牌字符串 |
| `chrome/installer/util/*` | 安装器显示名 |

## 用户数据目录 / 安装路径

| 文件 / 区域 | 改动要点 |
|-------------|----------|
| `chrome/install_static/chromium_install_modes.cc` | `kCompanyPathName` / `kProductPathName` → `i-thinking` |
| `chrome/install_static/*/install_constants*` | 安装模式常量与注册表路径 |
| `chrome/common/chrome_paths_win.cc`（及相关平台文件） | User Data 根路径品牌段 |
| `chrome/installer/setup/*` | 安装目录默认名 |

## 可执行文件与快捷方式

| 文件 / 区域 | 改动要点 |
|-------------|----------|
| `chrome/app/chrome_exe.ver` / version resources | FileDescription、ProductName |
| `chrome/installer/mini_installer/*` | 产物命名（可选：最终由 `pnpm command browser stage` 重命名为 `i-thinking.exe`） |
| Start Menu / shortcut IDS | 快捷方式标题 |

## WebUI / Apps 入口

| 文件 / 区域 | 改动要点 |
|-------------|----------|
| `chrome/browser/ui/webui/chrome_web_ui_configs.cc` | 注册 `IThinkingUIConfig`（见 patch 0001） |
| Apps 快捷键处理（如 `browser_view.cc`） | 打开 `chrome://i-thinking`（patch 0002） |
| Apps 快捷方式默认 pref | 默认 `true`（patch 0004） |

## Overlay 已提供

- `chrome/common/i_thinking_url_constants.h` — host / URL 常量  
- `chrome/browser/ui/webui/i_thinking/*` — WebUIController  
- `chrome/browser/resources/i_thinking/*` — 由 `browser sync` 从 Vite `dist` 生成；除 `OWNERS` 外不进 Git  

图标、关于页、崩溃上报产品名等可按发布节奏后续替换；先保证路径与 `chrome://i-thinking` 可用。

路径与安装总览见 [03-directories.md](./03-directories.md)、[04-install.md](./04-install.md)。
