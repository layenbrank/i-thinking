# OpenAPI 约定

## 目录布局

```
src/oas/
├── mod.rs       # OpenDoc、ALL_ROUTES、components 注册
├── common.rs    # body! 宏、ErrorBody、示例 struct
├── paths.rs     # 路由常量
├── auth.rs      # 按业务模块拆分 path doc
├── user.rs
└── ...
```

## path 文档函数

每个 HTTP 接口对应一个空函数 + `#[utoipa::path]`：

```rust
use super::common::{ErrorBody, ProfileBody};
use crate::services::auth::schema::ProfileP;

#[utoipa::path(
    put,
    path = "/api/v1/auth/profile",
    tag = "Auth",
    operation_id = "auth.toUpdate",
    summary = "更新个人信息",
    description = "需要 JWT。仅可修改 email/phone/gender/birthday/avatar，不可改 username/password。",
    security(("bearer_auth" = [])),
    request_body = ProfileP,
    responses(
        (status = 200, description = "更新成功（code=200000）", body = ProfileBody),
        (status = 200, description = "未登录（code=300001）", body = ErrorBody),
        (status = 200, description = "参数/业务错误", body = ErrorBody),
    )
)]
pub fn toUpdate_doc() {}
```

## Body schema（OpenAPI 不支持泛型）

在 `common.rs` 用 `body!` 宏：

```rust
body!(ProfileBody, ProfileR);
body!(UserListBody, Vec<UserR>);
```

禁止命名 `ApiXxxBody`；用 `{Action}Body` 或 `{Entity}Body`。

## mod.rs 注册

```rust
#[derive(OpenApi)]
#[openapi(
    paths(
        auth::toRead_doc,
        auth::toUpdate_doc,
        // ...
    ),
    components(schemas(
        ProfileP, ProfileR, ProfileBody,
        ErrorBody,
        // ...
    )),
    // ...
)]
pub struct OpenDoc;
```

## 导出与校验

```bash
cargo run --bin docs              # → spec/openapi.json
cargo test --test oas_consistency # 路由与 spec 一致
cargo run --bin service --features openapi  # Swagger UI
```

Swagger UI：`/swagger-ui/` · JSON：`/api-docs/openapi.json`

## description 必写内容

- HTTP 200 恒定 + 看 `body.code`
- 是否公开 / JWT
- 主要业务错误码指向 `guide/error-codes.md`
- 关联模块（如头像需先 upload）
