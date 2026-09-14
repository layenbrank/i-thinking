## UI 约定

仓库已完成 antd → shadcn/ui + Tailwind v4 迁移（studio / extension 不再有 antd 代码）：

- 组件：`@i-thinking/design/{primitive,assistant,composite}/*`（shadcn `new-york` + radix base + lucide 图标）；目录名即子路径，`hooks/*`、`lib/*`、`globals.css` 各自独立
- 设计 token 唯一源：`packages/design/src/styles/globals.css`；app 侧 `@source` 声明自己的源码
- 新增组件走 registry：`pnpm --filter @i-thinking/design registry:add <items>` → `registry:fix`
- chat 相关走 assistant-ui（`packages/chat` 提供端口契约与适配器）
