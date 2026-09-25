# 模块 README 模板

复制到 `src/services/{name}/README.md` 并替换占位符。

---

# {Name} 模块

{一句话说明}。路由前缀 `/api/v1/{prefix}`。

## 概述

| 能力 | 说明 |
|------|------|
| ... | ... |

**与 {other} 模块区别**：{对比表或段落}

## 路由一览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/v1/...` | JWT / 无 | ... |

## 鉴权说明

- 哪些路由需要 JWT
- 使用的守卫链接：[`Auth::required()`](../../guards/auth.rs)
- 典型错误码（如 `300001` 未登录）

## 数据表

### {table}（读/写/只读）

| 列 | 本模块用途 |
|----|-----------|
| id | ... |
| createdAt, updatedAt, creator, updater | 审计 |

详见 [`guide/database.md`](../../../guide/database.md)。

## 表协作

```
{table_a}.field ──FK──> {table_b}.id
```

跨模块流程（如：先 upload 再绑定 avatar）。

## 实现架构

```
{Controller}::toRead
  └── {Service}::toRead
        └── entity 查询
```

源码：[`module.rs`](module.rs) · [`controller.rs`](controller.rs) · [`service.rs`](service.rs) · [`schema.rs`](schema.rs)

---

## 接口详情

### {METHOD} {path}

**请求体**（`{XxxP}`）：

```json
{}
```

**成功响应**（`body.code = 200000`，data 为 `{XxxR}`）：

```json
{}
```

**常见错误**：

| code | 说明 |
|------|------|
| ... | ... |

（每个接口一节，含 curl 或 http 文件引用）
