# Findings: Morph IPC 重构

## Morph 命名空间冲突

`morph.ts`（ES 模块）与 `morph.d.ts` 同名时，`.d.ts` 被视为模块伴生声明，全局 `declare namespace Morph` 对 `stores/morph.ts` 不可见。

**方案**：删除 `morph.ts`，全部类型置于 `export namespace Morph`（`morph.d.ts`）。

## corex morph IPC 契约

| Args 键 | 返回 |
|---------|------|
| Meta, RenderPage, RenderThumbnails, Search, Split, SplitByCount, ToImages | `data` |
| Export, Merge, ToOffice | `path` |

字段 snake_case，与 `corex-core/src/morph/schema.rs` 一致。

## 打包闪退

`bootstrap.rs` 中 `spawn_sidecar()?` 失败会终止 setup。占位 `cmd.exe` 作为 sidecar 时生产环境易触发。

## pdfium.dll

corex 从可执行文件目录或 `COREX_PDFIUM_DIR` 加载；需随 bundle 分发并在 spawn 时设置环境变量。
