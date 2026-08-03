# 04 — Command / IPC 与前端 invoke

命名完整规范见 skill：[naming-conventions](../../../apps/client/src-tauri/.cursor/skills/naming-conventions/SKILL.md)。下文只列用法要点与命令表。

## 四层命名

| 层 | 形态 | 示例 |
|----|------|------|
| IPC | `namespace:kebab-action` | `reminder:write` |
| Command | `{namespace}_{action}` | `reminder_write` |
| Service | `toAction` | `Service::toWrite` |
| Entity | `ActionP::One \| Many` | `WriteP::One(Write)` |

- 分隔只用 `:`，不用 `/`、`_`
- 状态变更优先 `update-*`，不用 `set-*`
- 载荷 JSON **camelCase**；invoke 包装为 `{ params: ... }`

## 标准 CRUD

对 reminder / calendar / mirror / magnetic-tile：

| IPC | 典型返回 |
|-----|----------|
| `ns:write` | `Vec<String>`（新建 ids） |
| `ns:read` | `Vec<Model>` |
| `ns:update` | `Vec<String>`（更新的 ids） |
| `ns:remove` | `Vec<String>` |

Many 批量时 Service 内开事务。

## reminder:*

源码：[`command/src/reminder.rs`](../../../apps/client/src-tauri/crates/command/src/reminder.rs)

| IPC | params | returns |
|-----|--------|---------|
| `reminder:write` | `WriteP` | `Vec<String>` |
| `reminder:read` | `ReadP` | `Vec<Model>` |
| `reminder:update` | `UpdateP` | `Vec<String>` |
| `reminder:remove` | `RemoveP` | `Vec<String>` |

**Write 要点**：必须提供 `dueAt` 或非空 `fireTime`。  
**Change**：故意 **不含** `lastFiredAt`（仅 worker claim 写入）。

**Read 过滤**：`id` / `title` / `enabled` / `archived` / `dueFrom` / `dueTo`。

## calendar:*

源码：[`command/src/calendar.rs`](../../../apps/client/src-tauri/crates/command/src/calendar.rs)

| IPC | params | returns |
|-----|--------|---------|
| `calendar:write` | `WriteP` | `Vec<String>` |
| `calendar:read` | `ReadP` | `Vec<Model>` |
| `calendar:update` | `UpdateP` | `Vec<String>` |
| `calendar:remove` | `RemoveP` | `Vec<String>` |

**Write**：必填 `startAt`、`endAt`；可选 `reminderID`、`entireDay`、`color`。  
**Read**：`rangeFrom` / `rangeTo` 与区间相交；默认排除归档。

## 前端示例

### Reminder（[`stores/reminder.ts`](../../../apps/client/src/stores/reminder.ts)）

```ts
invoke<Reminder[]>('reminder:read', { params: filter })
invoke<string[]>('reminder:write', { params: { title, fireTime, weekDays, ... } })
invoke('reminder:update', { params: { key, change } })
invoke('reminder:remove', { params: key }) // string → RemoveP::One
```

write 返回 `ids`，通常取 `ids[0]`。

### Calendar（[`stores/calendar.ts`](../../../apps/client/src/stores/calendar.ts)）

```ts
invoke<Calendar[]>('calendar:read', { params: filter })
invoke<string[]>('calendar:write', { params: value })
invoke('calendar:update', { params: value })
invoke('calendar:remove', { params: key })
```

### 事件

```ts
listen('reminder:fired', (event) => { /* event.payload = reminder id */ })
```

## 例外模块（避免照抄错用）

| 模块 | IPC 风格 | 注意 |
|------|----------|------|
| countdown | `countdown:read` / `upsert` / `update` | 无 `remove`；无标准 `*P` |
| asset | 可能用 `insert` | 与 `write` 命名不一致 |

新增资源时：对齐 **reminder/calendar** 的 `write|read|update|remove` + `*P`，不要对齐 countdown。
