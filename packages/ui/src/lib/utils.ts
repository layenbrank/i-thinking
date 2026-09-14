/**
 * `@i-thinking/ui/lib/utils` 是 `cn` 的唯一入口。
 *
 * 上游 shadcn CLI 生成物直接 `import { cn } from 'cn'`（`migrate cn` 也会持续如此），
 * 这里做一次直连再导出，使 app 侧统一从 `@i-thinking/ui/lib/utils` 引入，
 * 避免「两套 cn 实现」并存。
 */
export { cn } from 'cn'
