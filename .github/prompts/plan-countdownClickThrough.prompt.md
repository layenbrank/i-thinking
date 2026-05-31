# Plan: Countdown 窗口点击穿透混合方案（2 + 6）

## TL;DR

对 countdown 浮窗实施**双层组合方案**消除透明死区：

- **Phase A（前端，立即收益）**：动态窗口尺寸 `setSize()` 跟随内容变化，物理上消除大部分透明死区
- **Phase B（Rust 后端，真自动）**：Rust 后台线程轮询全局光标 + 前端注册"可交互区域"矩形 → 按区域智能切换 `set_ignore_cursor_events`（"卡片可点、空白穿透"，完全自动，无需用户操作）

执行顺序：A → B（两个阶段都是必做项）

---

## Phase A：动态窗口尺寸

### 步骤

1. 修改 [apps/client/src/constants/window.ts](apps/client/src/constants/window.ts) countdown 配置：`height: 680→420`、`minHeight: 480→380`，作为"基础态"高度
2. 在 [apps/client/src/views/countdown/countdown.tsx](apps/client/src/views/countdown/countdown.tsx) `CountdownView` 内新增 effect：
   - 监听 `showSalary`（`monthlySalary > 0 && status in [working, after]`）和 `settingsOpen`
   - 根据组合计算目标高度（基础 420 + 薪酬卡 +140 + 设置面板 +360）
   - 调用 `getCurrentWindow().setSize(new LogicalSize(400, h))`
3. import 补充 `LogicalSize, getCurrentWindow` from `@tauri-apps/api/window`

### 相关文件

- [apps/client/src/constants/window.ts](apps/client/src/constants/window.ts) — `countdown` 配置块
- [apps/client/src/views/countdown/countdown.tsx](apps/client/src/views/countdown/countdown.tsx) — `CountdownView` 顶部加 effect

### 验证

- 启动 countdown，初始窗口高 420，仅显示 header + 状态卡 + 发薪日卡
- 设置月薪 > 0 进入工作时间 → 窗口扩展到 560
- 打开设置面板 → 窗口扩展到 920 / 780
- 关闭面板 → 平滑回缩

---

## Phase B：Rust 后端区域穿透（真自动）

### 架构

```
前端                            Rust (新增 click_through 模块)
─────────────                   ─────────────────────────────
注册可点击区域矩形列表  ──IPC──> tokio::sync::RwLock<Vec<Rect>>
（每个 .card 用 ref + ResizeObserver）         ↑
                                          每 50ms tokio 任务
                                               ↓
                                          GetCursorPos() / CGEventSource::location
                                               ↓
                                          判断坐标 vs (window.position + rects)
                                               ↓
                                          set_ignore_cursor_events(in_any_rect ? false : true)
```

### 步骤

**B1. 新增 Rust 模块** `apps/client/src-tauri/src/click_through/`

- `mod.rs` — 模块导出
- `state.rs` — `ClickThroughState { rects: RwLock<Vec<Rect>>, window_label: String }`
- `cursor.rs` — 跨平台 `get_cursor_position() -> Option<(i32, i32)>`
  - Windows: `windows` crate `Win32::UI::WindowsAndMessaging::GetCursorPos`
  - macOS: `core-graphics` crate `CGEventSource::location_from_event`
  - Linux: 返回 `None`（no-op 降级）
- `worker.rs` — 后台 tokio 任务，50ms 间隔轮询
- `command.rs` — `#[tauri::command] click_through_update_rects(rects: Vec<Rect>)`

**B2. 新增 Cargo 依赖** [apps/client/src-tauri/Cargo.toml](apps/client/src-tauri/Cargo.toml)

- `[target.'cfg(windows)'.dependencies] windows = { version = "0.x", features = ["Win32_UI_WindowsAndMessaging", "Win32_Foundation"] }`
- `[target.'cfg(target_os = "macos")'.dependencies] core-graphics = "0.x"`

**B3. 集成到 bootstrap**

- [apps/client/src-tauri/src/utils/bootstrap.rs](apps/client/src-tauri/src/utils/bootstrap.rs)：
  - setup 阶段 `app.manage(ClickThroughState::new("countdown"))`
  - 启动 tokio 后台任务（通过 `app.handle().spawn`）
  - invoke_handler 注册新命令
- [apps/client/src-tauri/src/lib.rs](apps/client/src-tauri/src/lib.rs)：注册 `pub mod click_through`

**B4. 前端注册可交互区域**

- 在 [apps/client/src/views/countdown/countdown.tsx](apps/client/src/views/countdown/countdown.tsx) 用 `useRef` 拿所有 `.card` 的 DOM 节点
- 用 `ResizeObserver` 监听尺寸变化，把 `getBoundingClientRect()` 结果通过 `invoke('click_through_update_rects', { rects })` 同步给 Rust
- 整窗 `pointer-events: none` 不再需要（让 Rust 全权管理）

**B5. 权限补全** [apps/client/src-tauri/capabilities/desktop.json](apps/client/src-tauri/capabilities/desktop.json)

- `core:window:allow-set-ignore-cursor-events`
- `core:window:allow-set-size`（Phase A 需要）

### 相关文件

- [apps/client/src-tauri/Cargo.toml](apps/client/src-tauri/Cargo.toml) — 平台依赖
- [apps/client/src-tauri/src/click_through/](apps/client/src-tauri/src/click_through/) — **新增** 完整模块（5 个文件）
- [apps/client/src-tauri/src/lib.rs](apps/client/src-tauri/src/lib.rs) — 模块声明
- [apps/client/src-tauri/src/utils/bootstrap.rs](apps/client/src-tauri/src/utils/bootstrap.rs) — state 管理 + tokio 任务 + 命令注册
- [apps/client/src-tauri/capabilities/desktop.json](apps/client/src-tauri/capabilities/desktop.json) — 权限补全
- [apps/client/src/views/countdown/countdown.tsx](apps/client/src/views/countdown/countdown.tsx) — ResizeObserver + rects 同步
- [apps/client/src/views/countdown/countdown.module.scss](apps/client/src/views/countdown/countdown.module.scss) — 移除 `pointer-events: none/auto` 配对

### 验证

- 鼠标停在卡片外的透明空白 → 点击穿透到桌面图标 / 后窗口
- 鼠标移到卡片 → 立刻可点击（按钮、输入框正常响应）
- 边缘抖动检测：靠近卡片边界拖动鼠标 → 不应有明显闪烁（50ms 轮询足够）
- 设置面板展开 / 收起时 → ResizeObserver 自动同步新 rects，无穿透错配

---

## Decisions / Constraints

- **跨平台范围**：Windows + macOS 完整支持，Linux 降级为 no-op（整窗可点击，与现状一致）
- **完全自动化**：不引入图钉按钮、全局快捷键、tray 菜单等手动控制（已取消方案 8 相关全部内容）
- **不使用方案 7（Electron forward 事件）**：Tauri 无等价 API
- **不使用方案 3/4（WS_EX_LAYERED / WM_NCHITTEST）**：需重写窗口创建逻辑，与 Tauri 抽象冲突
- **CSS pointer-events 移除**：避免与 Rust 控制冲突
- **轮询间隔 50ms**：兼顾响应性（< 1帧延迟）和 CPU 占用（< 0.1%）

## Further Considerations

1. **多窗口扩展**：当前 click_through state 写死 `countdown` window_label。如果之后 clock 窗口也需要同样能力，应改为 `HashMap<window_label, ClickThroughState>`，建议 Phase B 完成后视需求决定
2. **macOS 权限**：`CGEventSource` 在某些 sandbox 配置下需"输入监听"授权（System Settings > Privacy > Input Monitoring）；签名应用首次启动可能弹权限提示
3. **DPI 缩放**：`getBoundingClientRect()` 返回 CSS 像素，`GetCursorPos` 返回物理像素。需在 Rust 端用窗口的 `scale_factor()` 换算或前端发送时用 `window.devicePixelRatio` 乘
4. **窗口移动 / 多显示器**：Rust 端轮询时每次需重新读取窗口 `outer_position()`，否则用户拖动窗口后判断失效
5. **降级路径**：若 Rust 轮询失败（如 macOS 未授权输入监听），应回退为整窗可点击而非整窗穿透，避免用户完全无法操作
