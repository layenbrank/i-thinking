## iconify

Iconify 提供统一的图标生态（数十万个图标集合）。在本仓库里，你可能会同时看到以下几种用法/依赖，它们的定位不同，建议择一为主、避免混用：

### 三个核心包的区别与选择

| 包名               | 用途                                                                       | 何时选择                                           | 备注                                                                   |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `@iconify/vue`     | Vue 3 运行时组件 `<Icon icon="mdi:home" />`                                | 需要根据数据动态切换图标名、追求最少配置           | 有少量运行时代码；默认按需联网拉取图标，建议配合本地集合离线化         |
| `@iconify/iconify` | 浏览器运行时（DOM 扫描）渲染 `<span class="iconify" data-icon="mdi:home">` | 需要在非框架/静态 HTML 或三方内容中渲染图标        | 需在入口 `import '@iconify/iconify'` 才会扫描替换                      |
| `@iconify/json`    | 图标数据集（所有集合 JSON，或按集合子包）                                  | 构建期产出内联 SVG（零运行时）或给运行时做离线缓存 | 体积大，不要直接打包进浏览器；更推荐 `@iconify-json/<collection>` 子包 |

简单结论：

- 想快：用 `@iconify/vue`。
- 想零运行时/包体最小：用“构建期方案”（见下文 unplugin-icons），并只安装需要的 `@iconify-json/<collection>`。
- 用了 `<span class="iconify">` 却没显示？请改用 Vue 组件，或在入口引入 `@iconify/iconify`。

### 用法示例

1. Vue 运行时组件（推荐入门）

```vue
<!-- 任意 .vue -->
<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>

<template>
	<Icon icon="mdi:home" class="size-5" />
</template>
```

离线（减少网络请求）：

```ts
// 入口或页面按需一次性注册集合
import { addCollection } from '@iconify/vue'
import mdi from '@iconify-json/mdi/icons.json'
addCollection(mdi)
```

2. DOM 扫描（`@iconify/iconify`）

```ts
// main.ts 入口引入一次
import '@iconify/iconify'
```

```html
<span class="iconify size-5" data-icon="academicons:academia-square"></span>
```

提示：如果不引入运行时，上述 `<span class="iconify">` 不会被替换为 SVG。

3. Web Component（无需框架依赖）

```ts
// main.ts
import 'iconify-icon'
```

```html
<iconify-icon icon="mdi:home" class="size-5"></iconify-icon>
```

4. 构建期方案：unplugin-icons（零运行时，更佳性能）

```ts
// vite.config.ts（片段）
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

export default {
	plugins: [
		Icons({ autoInstall: true }),
		Components({ resolvers: [IconsResolver({ componentPrefix: 'Icon' })] })
	]
}
```

```vue
<template>
	<IconMdiHome />
</template>
```

说明：图标在构建期被转成内联 SVG，运行时零依赖；配合 `@iconify-json/<collection>` 可完全离线。

### VS Code 搭配：Iconify IntelliSense

- 安装扩展 “Iconify IntelliSense”。
- 在模板/JS/TS 中输入前缀（如 `mdi:`、`lucide:`）即可获得图标名补全与预览。
- 若想在引号内也触发补全，开启编辑器的“在字符串内建议”。

### 常见问题排查（FAQ）

- `<span class="iconify" data-icon="...">` 没渲染：缺少 `import '@iconify/iconify'`；或建议改用 Vue 组件 `<Icon />`。
- 生产包体过大：避免直接依赖整包 `@iconify/json`；改用 `@iconify-json/<collection>` 并只挑需要的集合。
- SSR/零运行时需求：优先使用 unplugin-icons 构建期方案。
- 图标名无效：用 VS Code 插件挑选图标，或到 Iconify 官网确认集合/命名。

### 选择建议（TL;DR）

- UI 里经常用“字符串决定图标名”：`@iconify/vue` + 按需 `addCollection`。
- 性能优先/SSR/可控包体：unplugin-icons + `@iconify-json/<collection>`；不再需要 `@iconify/vue`。
- 静态页面或第三方 HTML：`@iconify/iconify` 或 `iconify-icon` Web Component。
