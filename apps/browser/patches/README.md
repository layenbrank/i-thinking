# i-thinking Chromium patches

这些补丁是**指导性** unified diff： hunk 可能不完整，需按 Chromium 里程碑手工对齐。  
`pnpm command browser apply` 会尝试 `git apply --3way`；失败时按下方 **FILE / SEARCH / REPLACE** 手工改。  
**产品接线以 CLI wire 策略链为准**（含 `chrome_paks.gni`），不依赖 patch 必成功。

---

## 0001 — 注册 IThinkingUIConfig

**FILE:** `chrome/browser/ui/webui/chrome_web_ui_configs.cc`

**SEARCH:** 现有 `#include` 与 `RegisterChromeWebUIConfigs` 内其它 `configs.Add(...)` 调用附近。

**REPLACE / 添加：**

```cpp
#include "chrome/browser/ui/webui/i_thinking/i_thinking_ui.h"
```

在 `RegisterChromeWebUIConfigs`（或等价注册函数）中：

```cpp
  map.AddWebUIConfig(std::make_unique<IThinkingUIConfig>());
```

另需在对应 `BUILD.gn` 中把 `//chrome/browser/ui/webui/i_thinking` 加入 deps，并在 `chrome/chrome_paks.gni` 列入 `i_thinking_resources.pak`（由 `browser apply` 的 `ChromePaksStep` 完成）。

---

## 0002 — Apps 快捷键打开 chrome://i-thinking

**FILE:** 处理 `AppsPageShortcutPressed` 的入口（常见：`desktop_bookmark_bar_action_adapter.cc`）。

**SEARCH:** 打开 `chrome://apps` 或 `chrome::kChromeUIAppsURL` 的逻辑。

**REPLACE:** 改为打开 `chrome::kChromeUIIThinkingURL`。

---

## 0003 — 用户数据目录公司名

**FILE:** `chrome/install_static/chromium_install_modes.cc`（或 branding 对应的 install_modes）

**SEARCH:** `kCompanyPathName` / `kProductPathName` / user data 子目录名（常为 `"Chromium"`）。

**REPLACE:** 使用 `"i-thinking"`。

---

## 0004 — 默认显示 Apps 快捷方式

**FILE:** prefs 默认值注册处（如 `browser_ui_prefs.cc`）。

**SEARCH:** 控制「显示 Apps 快捷方式」的 pref，默认 `false`。

**REPLACE:** 默认改为 `true`。

---

## 应用顺序

1. `pnpm command browser apply`（overlay + patches 尝试 + wire）
2. 编译失败时对照本 README 的 SEARCH/REPLACE 手工修补
