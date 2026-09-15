# 05 — Reminder 与 Calendar：语义与正确用法

本文避免把闹钟、待办、日程混用。Core：[`reminder/service.rs`](../../../apps/client/src-tauri/crates/core/src/reminder/service.rs)、[`calendar/`](../../../apps/client/src-tauri/crates/core/src/calendar/)。

## 角色划分

| 实体 | 用途 | 时间主字段 |
|------|------|------------|
| **Reminder** | 提醒 / 待办 / **闹钟** | `dueAt` 或 `fireTime`(+`weekDays`) |
| **Calendar** | 日程事件（区间） | `startAt` + `endAt` |

关系：Calendar 可选 `reminderID` → Reminder；删 Reminder 时 FK SET NULL。

## Reminder 字段

| 字段 | 类型 | 语义 |
|------|------|------|
| `title` / `notes` | string | 标题与备注 |
| `dueAt` | `number \| null` (ms) | 绝对到期；调度优先于 fireTime |
| `endAt` | `number \| null` | 可选结束；调度不强依赖 |
| `fireTime` | `"HH:MM" \| null` | 日钟点（闹钟） |
| `weekDays` | JSON 字符串，默认 `"[]"` | ISO 周一=1…周日=7；**空数组 = 一次性** |
| `entireDay` | bool | UI 全天；调度路径基本不读 |
| `enabled` | bool | 开关；调度要求 `true` |
| `snoozeUntil` | ms \| null | 延后到该时刻再响 |
| `lastFiredAt` | ms \| null | **仅服务端/worker**；Change 不暴露 |
| `priority` | number | 默认 0 |
| `archivedAt` | ms \| null | `NULL`=活跃；有值=终态 |

### 写校验

创建时必须：`dueAt` 有值，**或** `fireTime` 非空。否则 Validation：`reminder requires dueAt or fireTime`。

### 两种提醒形态

| 形态 | 怎么建 | 谁用 |
|------|--------|------|
| 待办 / 到期提醒 | 设 `dueAt` | 日历日视图、通用列表 |
| 闹钟（Clock） | 设 `fireTime`，可选 `weekDays` | Clock overlay / marker |

Clock 列表过滤（前端）：

```ts
fireTime != null && archivedAt == null
```

见 [`alarm-time.ts`](../../../apps/client/src/features/magnetic-tiles/clock/alarm-time.ts)。

### archivedAt 用法

- 完成待办 / 软删 / UI「关掉」：`update` 设 `archivedAt: Date.now()`
- 恢复活跃：`archivedAt: null`（Change 三态）
- 一次性闹钟响后：worker 在 claim 时自动设 `archivedAt` + `enabled=false`
- **不要**再找 `isCompleted` / `completedAt`

读默认不含归档；需要历史时传 `archived: true`。

## Calendar 字段

| 字段 | 语义 |
|------|------|
| `startAt` / `endAt` | 必填区间（ms） |
| `entireDay` | 全天事件 |
| `color` | 可选 |
| `reminderID` | 可选关联提醒 |
| `archivedAt` | 软归档；**无** `enabled` / `fireTime` |

读区间：`endAt >= rangeFrom` 且 `startAt < rangeTo`（与 Core 过滤一致）。

**不要**用 Reminder 的 `dueAt`/`endAt` 代替日程区间；不要用 Calendar 当闹钟表。

## 响铃：claim-then-notify

Worker：[`src/reminder/worker.rs`](../../../apps/client/src-tauri/src/reminder/worker.rs)

```text
toReadSchedulable (enabled && archivedAt IS NULL)
  → should_fire(now)
  → toClaimFire (写 lastFiredAt，清 snooze；one-shot 则 archive+disable)
  → 系统通知 + emit reminder:fired
```

| 规则 | 说明 |
|------|------|
| 先 claim 再通知 | 避免先通知后落库导致连环响 |
| 同分钟去重 | `lastFiredAt` 落在同一本地分钟则跳过 |
| dueAt 追赶 | 到期后 24h 内且尚未在 due 后 fired |
| fireTime 追赶 | 目标钟点后 **15 分钟** grace |
| snooze | 若有 `snoozeUntil`，以该时刻为准 |

前端：监听 `reminder:fired` 刷新 UI；**不要**再起一套定时器发同等通知。

## 常见正确调用

**建闹钟（重复工作日）：**

```ts
await writeReminder({
  title: '起床',
  fireTime: '07:30',
  weekDays: '[1,2,3,4,5]',
  enabled: true,
})
```

**建一次性到期提醒：**

```ts
await writeReminder({
  title: '交报告',
  dueAt: Date.parse('2026-08-04T18:00:00'),
})
```

**Snooze：**

```ts
await updateReminder({
  key: id,
  change: { snoozeUntil: Date.now() + 9 * 60 * 1000 },
})
```

**软归档（完成）：**

```ts
await updateReminder({
  key: id,
  change: { archivedAt: Date.now() },
})
```
