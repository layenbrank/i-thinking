# Examples

抽象占位名：`resource`、`feature`、`namespace`。

## Frontend invoke

**Correct**

```ts
invoke('resource:update', { params: { key, change } })
invoke('feature:update-badge', { hasBadge: true })
invoke('feature:update-rects', { source, rects })
```

**Incorrect**

```ts
invoke('resource_update', ...)        // IPC snake_case
invoke('feature:updateBadge', ...)    // IPC camelCase
invoke('feature/set-badge', ...)      // 用 / 或 set
invoke('resource:update', { id })     // params 形状不匹配 Entity
```

## Four-layer template (CRUD update)

| Layer | Name |
|-------|------|
| IPC | `resource:update` |
| Command | `resource_update` + `rename = "resource:update"` |
| Service | `toUpdate` |
| Entity | `UpdateP::One \| Many` |

```rust
#[tauri::command(rename = "resource:update")]
pub async fn resource_update(params: UpdateP) -> Result<Vec<UpdateR>, Error> {
    Service::toUpdate(conn, params).await
}

// Service
match params {
    UpdateP::One(p) => { /* single */ }
    UpdateP::Many(ps) => { /* batch */ }
}
```

## Anti-patterns

| Bad | Why | Prefer |
|-----|-----|--------|
| `resource_insert` + `resource_inserts` | 双入口 | `resource:insert` + `InsertP::One\|Many` |
| Command `read` / `update` without prefix | 宏符号冲突 | `resource_read` / `resource_update` |
| Service `read` / `update_resource` | 破坏 `to*` | `toRead` / `toUpdate` |
| Type `ResourceUpdateParams` 重复 namespace | 冗长 | `UpdateP`（模块路径消歧） |
| `get_database_path` | `get` 前缀 | `database_path` |
