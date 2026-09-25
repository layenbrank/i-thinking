# 外部集成（Sidecar / Client）

Rust 主服务不直接持有云厂商 AK/SK。所有外部 HTTP 集成统一走 `src/clients/*`。

## 第一次改 sidecar 读什么

1. [`sidecars/README.md`](../sidecars/README.md) — Go 命令速查、JS/Rust/Go 对照、目录语义
2. 子项目 README（如 [`sidecars/aliyun-gateway/README.md`](../sidecars/aliyun-gateway/README.md)）— 架构、配置、排错
3. 本文件 — 分层规则与检查清单

## 分层

| 层 | 目录 | 职责 |
|----|------|------|
| 业务 | `src/services/` | OTP、上传等业务逻辑 |
| 客户端 | `src/clients/` | HTTP 调用侧车或外部 API |
| 侧车 | `sidecars/` | 自研 Go 服务（含官方 SDK） |
| 侧车配置 | `docker/*/` | JSON 配置、示例密钥文件 |
| 应用配置 | `config.yaml` | 仅 `base_url` / `api_key` / `timeout` |

## 侧车契约

- `GET /healthz` — compose healthcheck
- `X-API-Key` — Rust ↔ 侧车鉴权（密钥在两侧配置一致）
- 响应信封 `{ "code": 0, "message": "ok", "data": ... }`

## 当前集成

| 服务 | compose 名 | 端口 | 客户端 | 配置 |
|------|------------|------|--------|------|
| go-captcha | `gocaptcha` | 8080 | `clients/gocaptcha.rs` | `auth.captcha.*` + `docker/gocaptcha/` |
| 阿里云网关 | `aliyun-gateway` | 8090 | `clients/aliyun_gateway.rs` | `aliyun.gateway.*` + `docker/aliyun-gateway/` |

## 规则

1. **禁止**在 `services/` 中直接使用 `reqwest` 调外部 API
2. **禁止**在 Rust YAML 中存放阿里云 AK/SK
3. 同一云厂商多个产品共用一个 sidecar（如 `aliyun-gateway`），不拆多个容器
4. 新增集成时同步更新本文件与 [`guide/configuration.md`](configuration.md)

## 新增 sidecar 检查清单

- [ ] `sidecars/<name>/` + `go.mod`，入口目录 `command/<bin>/`
- [ ] `internal/`（config、handler、middleware、server、service）
- [ ] `docker/<name>/config.json` + `config.local.json.example`
- [ ] [`docker-compose.yml`](../docker-compose.yml) 服务 + healthcheck
- [ ] Rust `src/clients/<name>.rs` + `config.yaml` 连接字段
- [ ] [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) Go job
- [ ] [`sidecars/README.md`](../sidecars/README.md) 子项目表格
