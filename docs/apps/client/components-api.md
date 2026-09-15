# i-thinking Client 业务组件文档

本文件包含 `apps/client/src/components` 下业务通用组件的聚合文档。

> 总计 5 个组件包：ContextMenu、Combobox、Glide、Fallback、Provider  
> 不含 tiptap-\* 编辑器子树。

---

## contextmenu-cn

Source: `apps/client/src/components/contextmenu/`

---
category: Components
title: ContextMenu
subtitle: 右键菜单
description: 企业级可无限嵌套的右键菜单，支持声明式与命令式 API，主题对齐 Ant Design（`--ith-*`）。
group:
  title: 通用
  order: 1
---

## 实现总结 {#implementation-summary}

ContextMenu **未**薄封装 antd `Dropdown` / `Menu`，原因：

1. 全局 Menu recipe（侧栏黑底）会污染弹出菜单外观
2. 需要统一的 motion 进退场与多级定制渲染
3. 需要细粒度视口边界策略（每级子菜单独立 flip / shift）

| 能力 | 实现 |
|------|------|
| 面板 | 自研递归 `MenuPanel`（`panel.tsx`） |
| 数据结构 | `ContextMenuItem` 递归 `children`，`parseItems` 规范化 |
| 定位 | `parsePopupOrigin`：根菜单相对指针，子菜单相对父项；flip + shift + `boundaryPadding` |
| 主题 | `contextmenu.scss` 全部使用 `var(--ith-*)` |
| 动效 | `motion/react`（导入别名 `motion as Motion`）+ `useReducedMotion` |
| 声明式 | `<ContextMenu items={...}>{children}</ContextMenu>` |
| 命令式 | `useContextMenu().open({ x, y, items })` + `<ContextMenu.Host />` |

键盘：↑↓ 移动、→ 进子级、← 回退、Enter / Space 激活、Esc 关闭。点击外部或窗口 resize 关闭。

## 何时使用 {#when-to-use}

- 需要在区域上右键弹出操作菜单
- 需要多级子菜单、快捷键提示、危险项、分组与分割线
- 画布 / 非 DOM 触发场景需按坐标命令式打开菜单

## 代码演示 {#examples}

### 基本（声明式）

```tsx
import { ContextMenu } from '@/components/contextmenu'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons'

export default function Demo() {
  return (
    <ContextMenu
      items={[
        { key: 'copy', label: '复制', icon: <CopyOutlined />, shortcut: 'Ctrl+C' },
        { type: 'divider' },
        { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }
      ]}
      onClick={function (info) {
        console.log(info.key, info.keyPath)
      }}>
      <div style={{ padding: 48, border: '1px dashed #d9d9d9' }}>在此区域右键</div>
    </ContextMenu>
  )
}
```

### 多级子菜单

```tsx
import { ContextMenu, type ContextMenuItem } from '@/components/contextmenu'

const items: ContextMenuItem[] = [
  { key: 'edit', label: '编辑' },
  {
    key: 'export',
    label: '导出',
    children: [
      { key: 'png', label: 'PNG' },
      {
        key: 'vector',
        label: '矢量',
        children: [
          { key: 'svg', label: 'SVG' },
          { key: 'pdf', label: 'PDF' }
        ]
      }
    ]
  },
  { type: 'divider' },
  { key: 'delete', label: '删除', danger: true }
]

export default function NestedDemo() {
  return (
    <ContextMenu items={items}>
      <div style={{ padding: 48 }}>右键打开多级菜单</div>
    </ContextMenu>
  )
}
```

### 命令式

需在应用树中挂载一次 `ContextMenu.Host`（通常放在根布局）。

```tsx
import { ContextMenu, useContextMenu } from '@/components/contextmenu'

export function AppShell() {
  return (
    <>
      <ContextMenu.Host />
      <Canvas />
    </>
  )
}

function Canvas() {
  const menu = useContextMenu()

  return (
    <div
      style={{ width: 400, height: 300, background: '#f5f5f5' }}
      onContextMenu={function (event) {
        event.preventDefault()
        menu.open({
          x: event.clientX,
          y: event.clientY,
          items: [
            { key: 'pin', label: '固定' },
            { key: 'remove', label: '移除', danger: true }
          ],
          onClick: function (info) {
            console.log(info.key)
          }
        })
      }}
    />
  )
}
```

## API

### ContextMenu

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| items | 菜单数据（可递归 `children`） | `ContextMenuItem[]` | — |
| children | 触发区域；右键打开菜单。可为单一可克隆元素或任意节点 | `ReactNode` | — |
| disabled | 禁用右键菜单 | `boolean` | `false` |
| open | 受控打开状态 | `boolean` | — |
| className | 触发器 class（合并到子元素或包装 div） | `string` | — |
| classNames | 语义化 class，见 Semantic 文档 | `ContextMenuClassNames` | — |
| styles | 语义化行内样式 | `ContextMenuStyles` | — |
| motion | 覆盖根面板 / 子菜单 motion variants | `ContextMenuMotion` | 内置 |
| offset | 根菜单相对指针偏移 `[x, y]` | `[number, number]` | `[0, 4]` |
| submenuOffset | 子菜单相对父项偏移 | `[number, number]` | `[4, 0]` |
| boundaryPadding | 视口 / 容器内边距 | `number` | `8` |
| submenuOpenDelay | 悬停打开子菜单延迟（ms） | `number` | `100` |
| submenuCloseDelay | 离开后关闭子菜单延迟（ms） | `number` | `160` |
| findPopupContainer | 弹层挂载容器 | `() => HTMLElement` | `() => document.body` |
| renderItem | 自定义单项渲染 | `(item, node) => ReactNode` | — |
| renderPanel | 自定义面板内容包装 | `(nodes, meta) => ReactNode` | — |
| onOpenChange | 打开状态变化 | `(open: boolean) => void` | — |
| onClick | 点击叶子项 | `(info: ContextMenuClickInfo) => void` | — |

### ContextMenuItem

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| key | 唯一键；缺省时由 `parseItems` 生成 | `string` | — |
| type | `item` / `divider` / `group`；可省略，按结构推断 | `ContextMenuItemKind` | `item` |
| label | 文案 | `ReactNode` | — |
| icon | 左侧图标 | `ReactNode` | — |
| shortcut | 右侧快捷键提示（亦可使用 `extra`） | `ReactNode` | — |
| extra | 额外节点（与 shortcut 二选一展示逻辑） | `ReactNode` | — |
| danger | 危险样式 | `boolean` | `false` |
| disabled | 禁用 | `boolean` | `false` |
| children | 子菜单项（无限级） | `ContextMenuItem[]` | — |
| className / style | 单项样式 | — | — |
| onClick | 单项点击（先于菜单级 `onClick`） | `(info) => void` | — |

### ContextMenuClickInfo

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| key | 当前项 key | `string` |
| keyPath | 从根到当前的 key 路径 | `string[]` |
| domEvent | 鼠标或键盘事件 | `MouseEvent \| KeyboardEvent` |
| item | 原始项（解析后） | `ContextMenuItem` |

### useContextMenu

```ts
const { open, close } = useContextMenu()

open(payload: OpenPayload): void
close(): void
```

`OpenPayload`：`{ x, y, items, ...HostConfig }`，可覆盖与 `ContextMenu` 相同的定制字段（`classNames`、`motion`、`onClick` 等）。

### ContextMenu.Host

无 props。渲染命令式菜单的 Portal 宿主，应用内通常只挂一次。

### 工具函数

| 函数 | 说明 |
| --- | --- |
| `parseItems(items)` | 规范化 items，补全 key / type / 递归 children |
| `findFocusableItems(items)` | 可键盘聚焦的 item 列表（跳过 divider / group / disabled） |
| `parsePopupOrigin(input)` | 计算面板 `left/top` 与 `flipX/flipY` |

---

## combobox-cn

Source: `apps/client/src/components/combobox/`

---
category: Components
title: Combobox
subtitle: 组合输入框
description: 带可展开下拉区的输入组合框，支持前缀/后缀、IME 合成与 motion 展开动画。
group:
  title: 通用
  order: 2
---

## 何时使用 {#when-to-use}

- 需要「输入 + 下拉面板」一体的组合控件
- 下拉内容自定义（列表、复杂区块均可通过 `section` 传入）
- 需要处理中文等 IME 合成输入，避免合成过程中频繁 `onUpdate`

## 代码演示 {#examples}

### 基本

```tsx
import { useState } from 'react'
import { Combobox } from '@/components/combobox'

export default function Demo() {
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)

  return (
    <Combobox
      value={value}
      visible={visible}
      placeholder="搜索…"
      onClick={function () {
        setVisible(true)
      }}
      onUpdate={function (next) {
        setValue(next)
        setVisible(true)
      }}
      section={
        <Combobox.Series
          options={[
            { key: '1', label: '选项一', value: '1' },
            { key: '2', label: '选项二', value: '2', mark: '★' }
          ]}
        />
      }
    />
  )
}
```

### 自定义列表项

```tsx
<Combobox
  visible
  section={
    <Combobox.Series
      options={options}
      single={function (option) {
        return <span>{option.label} ({option.value})</span>
      }}
    />
  }
/>
```

## API

### Combobox

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| value | 受控输入值 | `string` | — |
| placeholder | 占位符 | `string` | — |
| className | 根 class | `string` | — |
| classNames | `root` / `trigger` / `section` | `object` | — |
| offset | 下拉相对根高度的偏移（px）；不传则用测量高度 | `number` | 测量值 |
| prefix | 输入前缀 | `ReactNode` | — |
| suffix | 输入后缀 | `ReactNode` | — |
| section | 下拉面板内容 | `ReactNode` | —（必填） |
| visible | 是否展示下拉 | `boolean` | — |
| onUpdate | 输入更新（IME 合成中不触发；合成结束触发） | `(value, domStringified, event) => void` | — |
| onClick | 根节点点击 | `(event) => void` | — |
| ref | 根 div ref | `Ref<HTMLDivElement>` | — |

展开时根节点带 `is-active` class；下拉使用 `motion` 做 scaleY / opacity 动画。

### Combobox.Series

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| options | 选项列表 | `SeriesOption[]` | — |
| single | 自定义单项渲染 | `(option) => ReactNode` | 默认 mark + label |

### SeriesOption

| 属性 | 说明 | 类型 |
| --- | --- | --- |
| key | React key | `string` |
| label | 展示文案 | `string` |
| value | 选项值（写入 `datatype`） | `string` |
| mark | 可选标记节点 | `ReactNode` |

---

## glide-cn

Source: `apps/client/src/components/glide/`

---
category: Components
title: Glide
subtitle: 滚动容器
description: 横向 / 纵向滚动容器。`Glide.X` 通过 CSS 旋转技巧将垂直滚轮映射为水平滚动。
group:
  title: 通用
  order: 3
---

## 何时使用 {#when-to-use}

- 需要统一的横向或纵向可滚动内容区
- 横向列表希望保留鼠标滚轮的自然垂直手势（`Glide.X`）

## 代码演示 {#examples}

### 横向滚动

```tsx
import { Glide } from '@/components/glide/glide'

export default function Demo() {
  return (
    <Glide.X style={{ height: 120, width: 320 }}>
      {Array.from({ length: 12 }, function (_, i) {
        return (
          <div key={i} style={{ width: 80, height: 80, flexShrink: 0, marginRight: 8, background: '#eee' }}>
            {i}
          </div>
        )
      })}
    </Glide.X>
  )
}
```

### 纵向滚动

```tsx
import { Glide } from '@/components/glide/glide'

export default function Demo() {
  return (
    <Glide.Y style={{ height: 200, width: 280 }}>
      <div style={{ height: 800 }}>长内容…</div>
    </Glide.Y>
  )
}
```

## API

### Glide.X / Glide.Y

二者 Props 相同。

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| children | 滚动内容 | `ReactNode` | — |
| className | 根 class（`ClassValue`） | `ClassValue` | — |
| classNames | `root` / `wrapper` / `inner` | `object` | — |
| style | 根行内样式 | `CSSProperties` | — |
| styles | `root` / `wrapper` / `inner` 行内样式 | `object` | — |
| onScroll | 滚动回调（绑在 wrapper 上） | `(event) => void` | — |

**结构**

- `Glide.X`：`root` → `wrapper(-90°)` → `inner(+90°, flex)`；通过 `--glide-width` / `--glide-height` CSS 变量同步尺寸
- `Glide.Y`：`root` → `wrapper(overflow-y)` → `inner`

---

## fallback-cn

Source: `apps/client/src/components/fallback/`

---
category: Components
title: Fallback
subtitle: 回退占位
description: 路由级全屏加载占位。
group:
  title: 通用
  order: 4
---

## 何时使用 {#when-to-use}

- React Router / 懒加载路由的 `Suspense` fallback
- 需要全视口居中的 Loading 指示

## 代码演示 {#examples}

### 路由 Fallback

```tsx
import { Suspense } from 'react'
import { Fallback } from '@/components/fallback'

export default function RouteShell() {
  return (
    <Suspense fallback={<Fallback.Route />}>
      <LazyPage />
    </Suspense>
  )
}
```

## API

### Fallback.Route

无 Props。渲染全视口居中的 antd `Spin` +「Loading...」文案。

导出形态：

```ts
export const Fallback = { Route }
```

---

## provider-cn

Source: `apps/client/src/components/provider/`

---
category: Components
title: Provider
subtitle: 应用级提供者
description: 插件生命周期 Provider 与 React Query Provider。
group:
  title: 通用
  order: 5
---

## 何时使用 {#when-to-use}

- **PluginProvider**：在应用根注册可挂载/卸载的插件（存储、智能助手等），按优先级挂载
- **QueryProvider**：为应用提供 TanStack Query 客户端（内部 `buildQueryClient`）

## 代码演示 {#examples}

### PluginProvider

```tsx
import { PluginProvider, type Plugin } from '@/components/provider/plugin'

const plugins: Plugin[] = [
  {
    unique: 'storage',
    priority: 10,
    mount: function () {
      /* init */
    },
    unmount: function () {
      /* dispose */
    }
  }
]

export default function App() {
  return (
    <PluginProvider
      plugins={plugins}
      onError={function (plugin, error) {
        console.error(plugin.unique, error)
      }}>
      <AppRoutes />
    </PluginProvider>
  )
}
```

### 读取插件状态

```tsx
import { usePluginContext } from '@/components/provider/plugin'

function Status() {
  const { getter } = usePluginContext()
  const state = getter('storage')
  return <span>{state?.status}</span>
}
```

### QueryProvider

```tsx
import { QueryProvider } from '@/components/provider/query'

export default function App() {
  return (
    <QueryProvider>
      <AppRoutes />
    </QueryProvider>
  )
}
```

## API

### PluginProvider

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| children | 子树 | `ReactNode` | — |
| plugins | 插件列表（按 `unique` 去重，`enabled !== false` 过滤，`priority` 降序挂载） | `Plugin[]` | `[]` |
| onError | 挂载失败回调 | `(plugin, error) => void` | — |

卸载顺序：先卸载被移除的插件；Provider 卸载时按挂载逆序全部 `unmount`。

### Plugin

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| unique | 唯一标识 | `string` | — |
| mount | 挂载 | `() => void` | — |
| unmount | 卸载 | `() => void` | — |
| priority | 越大越先挂载 | `number` | `0` |
| enabled | `false` 时跳过 | `boolean` | `true` |

### usePluginContext

返回 `{ getter(unique: string) => PluginState | undefined }`。

`PluginState`：`{ plugin, status: 'mounted' \| 'error', error? }`。

### QueryProvider

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| children | 子树 | `ReactNode` | — |

内部使用 `useState(buildQueryClient)` 创建稳定的 `QueryClient`，再包 `QueryClientProvider`。
