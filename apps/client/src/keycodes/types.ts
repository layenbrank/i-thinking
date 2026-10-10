/**
 * keycode 标识：谁处理什么键。
 *
 * 注册见 `keycodes/react.ts`（`useKeyCode`），派发见 `keycodes/dispatcher.ts`。
 * 派发点（按键来源）：
 * - `screenshot`：主窗口的全局快捷键 `Alt+Q`（`views/overview`）—— 没有组件接管时直连 `capture:open`
 * - `escape`：overlay 窗口的 ESC（`views/overlay`）—— 没有组件接管时兜底退出截屏
 * 可配置 bindings + `keycode.json` 持久化（原 `keycodes/store.ts`）已随插件宿主移除。
 */
type KeyCodeID = 'screenshot' | 'escape'

export type { KeyCodeID }
