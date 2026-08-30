# Worker：R2 安装包下载

Cloudflare Worker（TypeScript），从 R2 桶 `i-thinking` 按版本路径流式提供 Windows 安装包。

| 项 | 值 |
|----|-----|
| 位置 | [`scripts/infra/worker`](.)（**非** pnpm workspace app） |
| 线上地址 | `https://i-thinking-downloads.layenbrank.workers.dev` |
| 入口 | [`src/worker.ts`](./src/worker.ts) |
| 绑定 | `DOWNLOADS` → 桶 `i-thinking` |
| 密钥 | `AUTH_KEY_SECRET`（写操作） |

由根 CLI 驱动（仓库根）：

```powershell
pnpm command worker deploy
pnpm command worker secret
pnpm command worker dev
pnpm command worker upload
```

等价快捷：`pnpm worker deploy`（若根 scripts 保留 `worker`）。

类型依赖由仓库根 `devDependencies`（`wrangler` / `@cloudflare/workers-types`）提供。不要提交 `worker-configuration.d.ts`。

上架填写见 [`markdown/store-package-handoff.md`](../../../markdown/store-package-handoff.md)。
