# Findings & Decisions

## Requirements
- 去掉 DatabaseService 对 UserRepository 的无意义包裹
- 新增 repository 时不必再在 Service 写转发方法
- 同步分层文档

## Research Findings
- 调用链原为：handlers → DatabaseService → UserRepository → Prisma
- DatabaseService 四个方法仅改名转发，无事务/编排/校验
- store/dialog/sidecar 为 handlers → Service（Service 即适配层），无额外 Repository
- 企业级 Service 用于用例编排，不是 CRUD 透传机

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| handlers 注入 UserRepository | 删除透传层，保留 Prisma/DTO 隔离 |
| Service 文档改为可选 | 有跨实体/事务时再加具名用例，不复活巨型门面 |

## Resources
- `src/main/modules/database/`
- `docs/modules.md`、`docs/architecture.md`
