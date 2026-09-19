# 配置（YAML）

配置来源：[`configures/configure.rs`](../configures/src/configure.rs) · 加载器 [`configures/loader.rs`](../configures/src/loader.rs)

应用配置使用分层 YAML（见 [`config.yaml`](../config.yaml)），**不使用**任何 `.env` 文件。Docker 依赖栈见 [`docker-compose.yml`](../docker-compose.yml)（内置 `name: corex`，直接 `docker compose up -d` 即可）。

| 文件                    | 说明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `config.yaml`           | 基础默认值（入库）                                             |
| `config.{profile}.yaml` | profile 覆盖（如 `development` / `production`）                |
| `config.local.yaml`     | 本机密钥与连接串（**不入库**，见 `config.local.yaml.example`） |

合并顺序：`config.yaml` → `config.{profile}.yaml` → `config.local.yaml`（后者覆盖前者）。

**profile** 用于选择 `config.{profile}.yaml`：

1. shell 环境变量 `APP_ENV` 或 `RUST_ENV`（可选，常用于 CI / 部署）
2. 否则读 `config.yaml` 的 `app.env`
3. 默认 `development`

**运行模式**（是否生产、是否返回 `Exception.details`、OTP mock 等）由合并后的 `app.env` 决定。

## 常用字段

| 路径                                  | 默认值                             | 说明                                                           |
| ------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `server.host`                         | `127.0.0.1`                        | 监听地址                                                       |
| `server.port`                         | `3000`                             | 监听端口                                                       |
| `database.url`                        | 见 `config.yaml`                   | PostgreSQL 连接串                                              |
| `security.jwt_secret`                 | （占位）                           | JWT 签名，至少 32 字符                                         |
| `security.encryption`                 | `argon2`                           | `argon2` 或 `aes`（生产禁止 aes 存密码）                       |
| `logging.dir`                         | `logs`                             | 日志目录                                                       |
| `app.swagger`                         | `development: true`                | 是否启用 Swagger UI                                            |
| `auth.captcha.enabled`                | `true`（development 默认 `false`） | `false` 时跳过 `check-data`（仅联调）；生产强制 `true`         |
| `auth.captcha.base_url`               | `http://127.0.0.1:8080`            | go-captcha-service HTTP（仅内网）                              |
| `auth.captcha.api_key`                | （见 `config.yaml`）               | 侧车 `X-API-Key`，生产放 `config.local.yaml`                   |
| `auth.captcha.kind`                   | `slide-default`                    | 默认题型 ID（`get-data` / `check-data`）                       |
| `auth.captcha.timeout_ms`             | `5000`                             | 调用侧车超时                                                   |
| `auth.captcha.ip_rate_limit`          | `30`                               | 每分钟每 IP 取题次数                                           |
| `auth.rate_limit.enabled`             | `true`                             | Auth 路由 HTTP IP 限流（actix-governor）                       |
| `auth.rate_limit.burst_size`          | `20`                               | 突发请求上限                                                   |
| `auth.rate_limit.requests_per_minute` | `30`                               | 每分钟每 IP 补充配额                                           |
| `auth.trust_proxy`                    | `false`                            | 是否信任 `X-Forwarded-For`（反向代理场景）                     |
| `aliyun.gateway.base_url`             | `http://127.0.0.1:8090`            | aliyun-gateway HTTP（仅内网）                                  |
| `aliyun.gateway.api_key`              | （见 `config.yaml`）               | 侧车 `X-API-Key`，生产放 `config.local.yaml`                   |
| `aliyun.gateway.timeout_ms`           | `10000`                            | 调用侧车超时                                                   |
| `aliyun.gateway.sms_template_code`    | `SMS_xxxx`                         | 默认短信模板 ID                                                |
| `gateway.daily_token_quota`           | `1000000`                          | 全局兜底日 token 配额（无租户身份、团队租户）                  |
| `gateway.free_daily_token_quota`      | `100000`                           | 个人租户免费档日 token 配额（无有效订阅时）                    |
| `gateway.plan_daily_token_quota`      | `BASIC` / `PRO`                    | 订阅档位日配额（`档位名 → 配额`），与 `subscription.plan` 对应 |
| `gateway.upstream_timeout_ms`         | `120000`                           | 上游模型流式读超时                                             |
| `gateway.usage_es_index`              | `gateway_usage`                    | 用量事件写入的 ES 索引                                         |
| `gateway.audit_enabled`               | `true`                             | 审计落库开关                                                   |

### 模型网关配额

日配额按下列优先级取**第一个命中项**；Redis 键 `gateway:quota:{scope}:{id}:{yyyy-mm-dd}`，按 UTC 午夜重置。

| 优先级 | 来源                                            | 适用                                                       |
| ------ | ----------------------------------------------- | ---------------------------------------------------------- |
| 1      | `gateway_model.dailyTokenQuota > 0`             | 单模型覆盖                                                 |
| 2      | 订阅档位 `gateway.plan_daily_token_quota[plan]` | 个人租户（`tenant.type = PERSONAL`）且有**此刻生效**的订阅 |
| 3      | 免费档 `gateway.free_daily_token_quota`         | 个人租户无有效订阅（含订阅已过期）                         |
| 4      | 全局兜底 `gateway.daily_token_quota`            | 团队租户（`TEAM`）与无租户身份（按用户维度计）             |

未知档位名（配置删改后残留的订阅）回落**免费档**，避免超发。订阅的增删改见 [`src/services/subscription/README.md`](../src/services/subscription/README.md)；
查某租户当前生效的配额与来源用 `GET /api/v1/tenants/{id}/quota`（`source` = `PLAN` / `FREE` / `GLOBAL`）。

档位解析结果带 **60s Redis 缓存**（`gateway:plan:{tenantID}`，开通/取消订阅时立即失效），避免聊天热路径每次请求都查库。

完整字段见 [`config.yaml`](../config.yaml)。集成总览见 [`integrations.md`](integrations.md)。

## 行为验证码（go-captcha-service）

本地依赖栈包含 **go-captcha** 侧车（[`docker-compose.yml`](../docker-compose.yml) 服务 `gocaptcha`）：

```powershell
docker compose up -d gocaptcha
```

配置目录 [`docker/gocaptcha/`](../docker/gocaptcha/)（`config.json` + `gocaptcha.json`）。侧车使用 compose 内 **Redis** 缓存 `captchaKey` 状态；Rust 服务通过 `auth.captcha.base_url` 代理 `get-data` / `check-data`，**不在本服务 Redis 存答案**。

前端联调使用 [`go-captcha-react`](https://github.com/wenlng/go-captcha-react)（非 hCaptcha SaaS）。流程：

1. `POST /api/v1/auth/captcha` → `captchaKey` + 拼图 Base64
2. 用户完成滑块/点选 → 提交 `captchaKey` + `captchaValue` 到 `signin` / `signup` / `otp`

与 hCaptcha 对比：hCaptcha 为云端 Widget + `siteverify` token；本仓库为自托管 go-captcha 侧车 + 坐标校验。

## 阿里云网关（OTP 短信）

手机 OTP 在非 mock 环境下经 **aliyun-gateway** 侧车发送（Docker 服务 `aliyun-gateway`）：

```powershell
docker compose up -d aliyun-gateway
```

- Rust 配置：`aliyun.gateway.*`（连接信息与模板 ID）
- 侧车配置：[`docker/aliyun-gateway/`](../docker/aliyun-gateway/)（AK/SK、签名放 `config.local.json`）
- 客户端：[`src/clients/aliyun_gateway.rs`](../src/clients/aliyun_gateway.rs)
- 开发期 `auth.otp.mock: true` 时验证码仅写日志；生产 `mock: false` 且通道为手机时调用 `POST /api/v1/sms/send`

邮箱 OTP 尚未接入（DirectMail 阶段 2）。

## 本地覆盖

```powershell
Copy-Item config.local.yaml.example config.local.yaml
# 编辑 database.url、security.* 等
```

## 数据库迁移

```bash
cargo run -p migration -- up
cargo run -p migration -- status
```

迁移二进制会从 YAML 读取 `database.url` 并设置 `DATABASE_URL`（若环境中未显式设置）。`bun run migrate:fresh` 同理。

应用启动时会调用 `Migrator::up`，一般不必单独跑 CLI。

## Docker 本地依赖

```powershell
docker compose up -d
docker compose ps
```

| 服务     | 端口 | 数据目录（绑定挂载）                                                         |
| -------- | ---- | ---------------------------------------------------------------------------- |
| postgres | 5432 | [`data/postgres`](../data/postgres)；镜像 `docker/postgres`（`zh_CN.UTF-8`） |

locale 只在**首次** initdb 写入。若已是 `en_US`，需：

```powershell
docker compose stop postgres
Remove-Item -Recurse -Force .\data\postgres
docker compose build postgres
docker compose up -d postgres
```

| redis | 6379 | [`data/redis`](../data/redis) |
| gocaptcha | 8080 | 行为验证码侧车（`wenlng/go-captcha-service:1.0.5`，内嵌 [go-captcha v2.0.5](https://github.com/wenlng/go-captcha/releases/tag/v2.0.5)；Docker Hub 无 `latest`） |
| aliyun-gateway | 8090 | 阿里云 API 网关（自研 Go，[`sidecars/aliyun-gateway`](../sidecars/aliyun-gateway)） |
| elasticsearch | 9200 | [`data/elasticsearch`](../data/elasticsearch) |

配置见 [`docker-compose.yml`](../docker-compose.yml)。`data/` 已 gitignore。

## 脚本

`scripts/utils/config.ts` 与 Rust 使用相同合并规则，供 `bun run upload` 等读取 `server.host` / `server.port`。

## 生产部署

1. 设置 `APP_ENV=production`（或 `config.production.yaml` + `app.env: production`）
2. 通过 `config.local.yaml` 或部署平台注入 `security.*`、`database.url`
3. 生产环境 `auth.otp.mock` 自动为 `false`
