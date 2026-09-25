# Payment

> 扫码支付（**微信 Native** + **支付宝当面付**）：把 `pay.plans` 里定价的档位卖给用户，付款成功后开通 / 续订订阅（`src/services/subscription`）。

## 概述

| 能力     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 目录     | 可售档位（含定价、日配额、是否可售 + 原因）与渠道可用性，客户端渲染三步下单的唯一数据源 |
| 下单     | **只接受档位 + 渠道**，金额由服务端按 `pay.plans` 定价；返回 `codeUrl` 供渲染二维码     |
| 查单     | 客户端「刷新支付状态」；回调丢失时向上游查单核销，并自愈「已收款未开通」                 |
| 关单     | 用户取消支付；已支付订单拒绝关闭（退款走原渠道，不在本模块）                             |
| 回调     | 验签 → 渠道归属核对 → 金额/币种核对 → 幂等核销 → 开通订阅                               |
| 开通     | 续费不浪费剩余时长：生效订阅未到期时从其到期时间续期                                     |

## 与同域其他模块的区别

| 模块                        | 职责                                                                       |
| --------------------------- | -------------------------------------------------------------------------- |
| `src/services/payment`      | 收钱：订单生命周期、渠道凭据与验签、金额核对、核销                         |
| `src/services/subscription` | 权益：订阅增删查、生效判定、配额来源                                       |
| `src/services/gateway`      | 用权益：聊天热路径按订阅档位取日配额                                       |

**信任边界**：`SubscriptionService::subscribe` 是自助入口（租户 OWNER/ADMIN 即可调），`SubscriptionService::grant` 是可信通道（仅本模块等已确权链路内部调用）。**已定价档位（`amount > 0`）只允许走 `grant`**：自助调用会被 500408 拒绝，避免绕过收银台白拿付费档位。

## 路由一览

| 方法 | 路径                                            | 鉴权                 | 说明                     |
| ---- | ----------------------------------------------- | -------------------- | ------------------------ |
| GET  | `/api/v1/tenants/{id}/pay/catalog`              | JWT + 租户成员       | 档位定价 + 渠道可用性    |
| GET  | `/api/v1/tenants/{id}/orders`                   | JWT + 租户成员       | 订单历史（最近 20 条）   |
| POST | `/api/v1/tenants/{id}/orders`                   | JWT + OWNER/ADMIN    | 下单（`plan` + `channel`）|
| GET  | `/api/v1/tenants/{id}/orders/{orderNo}`         | JWT + 租户成员       | 订单详情（顺带惰性关单） |
| POST | `/api/v1/tenants/{id}/orders/{orderNo}/sync`    | JWT + 租户成员       | 主动查单（回调兜底）     |
| POST | `/api/v1/tenants/{id}/orders/{orderNo}/close`   | JWT + OWNER/ADMIN    | 关闭订单（用户取消）     |
| POST | `/api/v1/pay/notify/wechat`                     | 无（验签即鉴权）     | 微信支付结果通知         |
| POST | `/api/v1/pay/notify/alipay`                     | 无（验签即鉴权）     | 支付宝异步通知           |

回调端点**不套平台响应信封**：微信要求 `200 {"code":"SUCCESS"}` / `500 {"code":"FAIL"}`，支付宝要求纯文本 `success` / `failure`，否则渠道会持续重试或标记异常。

## 数据表

`payment_order`（订单快照：金额、档位、时长在下单时固化，后续改价不影响存量订单）

| 列 (DB)                                  | 类型        | 说明                                              |
| ---------------------------------------- | ----------- | ------------------------------------------------- |
| id                                       | uuid PK     | 主键                                              |
| orderNo                                  | text UNIQUE | `P` + 秒级 UTC 时间戳 + 随机段，仅字母数字        |
| tenantID                                 | uuid FK     | → `tenant.id`，CASCADE，索引 `idx_payment_order_tenant` |
| userID                                   | uuid FK     | → `auth.id`，下单人（开通时作为订阅归属人）       |
| plan / channel                           | text        | 档位名（须存在于 `pay.plans`）/ `WECHAT` `ALIPAY` |
| amount / currency                        | bigint/text | **服务端定价**，`CURRENCY = CNY`                  |
| status                                   | text        | PENDING / PAID / CLOSED                           |
| durationDays                             | int NULL    | NULL = 永久有效（档位定价里的 `duration_days`）    |
| transactionID                            | text NULL   | 渠道流水号                                        |
| codeUrl                                  | text NULL   | 二维码内容（微信 `code_url` / 支付宝 `qr_code`）  |
| subscriptionID                           | text NULL   | 开通出的订阅 ID；为 NULL 表示「已收款未开通」     |
| paidAt / expiresAt                       | timestamptz | 支付时间 / 订单过期时间                           |
| remark                                   | text NULL   | 人工核对线索（金额不符、迟到支付、下单失败等）    |
| archivedAt / creator / updatedAt / updater |            | 审计字段                                          |

`{id}/orders/{orderNo}/sync` 与订单列表都会顺带把该租户过期未支付的订单置为 `CLOSED`（惰性关单），因此客户端拿到的状态不会滞留。

## 实现架构

```
payment/
├── channel/            渠道适配（策略 + 表驱动，见下）
│   ├── mod.rs          Channel trait、注册表、availability()
│   ├── signature.rs    商户私钥签名 / 平台公钥验签（PEM）
│   ├── wechat.rs       微信 Native：prepay / query / verify_notify / close
│   └── alipay.rs       支付宝当面付：precreate / query / verify_notify
├── service.rs          订单生命周期 + 核销状态机（只依赖 channel 抽象）
├── controller.rs       HTTP 出入口（含渠道回执格式差异）
├── schema.rs           请求 / 响应 DTO（`OrderP` / `OrderR` / `CatalogR`）
└── module.rs           路由注册
```

新增渠道 = 实现 `Channel` 并在注册表加一项（`code` + 工厂），**不需要**改 `service.rs`；`require_ready(config, code)` 负责「未启用 / 未配置」的拒绝与原因文案。

## 下单 → 支付 → 开通

```
POST /tenants/{id}/orders {plan, channel}
  │  鉴权 OWNER/ADMIN + 个人租户校验
  │  渠道就绪？(channel::require_ready) 档位定价且可售？(unsellable_reason)
  │  惰性关单 → 同用户+档位+渠道的未过期 PENDING 订单直接复用二维码
  ├─ 落库 PENDING（金额/时长/过期时间均为快照，orderNo 唯一）
  └─ 渠道 prepay → 写 codeUrl；失败即关单（不留永远没有二维码的待支付订单）
       ↓ 客户端渲染二维码
渠道回调 /api/v1/pay/notify/*（或客户端 sync 主动查单）
  │  ① 验签：微信 AES-256-GCM 解密 + 平台证书公钥验签；支付宝公钥验签
  │  ② 渠道归属：回调渠道必须等于下单时选择的渠道（否则 500406）
  │  ③ 幂等：已 PAID 且有 subscriptionID 直接 200
  │  ④ 金额 / 币种核对：不一致 → 500404，写 remark，**绝不开通**
  └─ settle()：条件更新 PENDING/CLOSED → PAID（并发只有一方翻转成功）
       └─ activate()：SubscriptionService::grant（可信通道）→ 回写 subscriptionID
                      → 失效 gateway:plan:{tenantID} 缓存
```

## 安全设计要点

| 风险                   | 措施                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| 客户端改价             | 下单只接受 `plan` + `channel`，金额一律取 `pay.plans`，请求体里的任何金额字段都被忽略             |
| 伪造回调               | 匿名端点但必须先过签名校验（微信 AES-256-GCM + 平台证书；支付宝公钥），失败返回 500406             |
| 跨渠道重放             | 回调渠道必须与订单渠道一致，否则 500406                                                          |
| 少付 / 币种不符        | 实收金额与币种必须与订单快照完全一致，否则 500404 + remark 待人工对账，不开通                      |
| 重复回调 / 并发核销    | 已开通直接返回；`settle` 用 `WHERE status IN (PENDING, CLOSED)` 条件更新，只有翻转成功者开通；订阅侧唯一索引冲突（400002）视为并发成功回读 |
| 绕过收银台白拿付费档位 | 已定价档位禁止自助开通（500408），只能由 `grant`（支付回调）开通                                  |
| 未配置渠道被误用       | `pay.*.enabled: false` 时目录标不可用、下单返回 500405；凭据为空时启动即失败（宁启动失败不带半截凭据上线） |
| 未定价 / 配额缺失档位  | `unsellable_reason` 判定（`amount <= 0` 或 `gateway.plan_daily_token_quota` 缺项）→ 目录 `purchasable: false` + 下单 500408 |
| 已收款但开通失败       | 保留 `PAID` + 空 `subscriptionID` + remark，`sync` 可自愈补齐订阅，人工也能按 remark 定位          |

## 时效性设计要点

| 场景           | 处理                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------- |
| 订单过期       | `pay.order_ttl_secs`（默认 300s）；惰性关单在列表 / 详情 / `sync` 时执行，无需定时任务            |
| 迟到支付       | 订单已 `CLOSED` 后仍收到成功回调 → **照常开通**（钱已收，不能让用户付钱不到账），remark 记「迟到支付」 |
| 重复点击下单   | 同用户 + 档位 + 渠道的未过期 `PENDING` 订单复用二维码，避免并行订单一堆                            |
| 回调丢失       | 客户端 `sync` 主动向上游查单核销；`sync` 亦会补齐缺二维码的订单                                    |
| 续费           | 以当前生效订阅的到期时间为基数续期，不浪费剩余时长                                                |
| 配额生效延迟   | 开通后立即 `cache_invalidate(gateway:plan:{tenantID})`，避免「已付款但配额仍是免费档」            |

## 接口详情

### GET 目录

响应 `catalog`：

| 字段             | 说明                                                          |
| ---------------- | ------------------------------------------------------------- |
| `currency`       | 固定 `CNY`                                                    |
| `orderTtlSecs`   | 订单有效期，客户端据此做倒计时                                |
| `plans[]`        | `plan` / `label` / `amount` / `durationDays` / `dailyTokenQuota` / `purchasable` / `reason` |
| `channels[]`     | `code` / `label` / `enabled` / `reason`                       |
| `currentPlan`    | 当前生效档位（无有效订阅为 `null`）                           |

### POST 下单

请求：`{ "plan": "PRO", "channel": "WECHAT" }` → 响应 `order`（含 `codeUrl`、`orderExpiresAt`）。

### POST 同步 / 关闭

| 端点            | 行为                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| `.../sync`      | 已收款未开通 → 补齐订阅；过期未支付 → 关单（500403）；缺二维码 → 重新下单；否则向上游查单核销 |
| `.../close`     | 已支付 → 200003「订单已支付，无法关闭」；已关闭 → 幂等返回                                |

## 错误码

| code   | 场景                                                                     |
| ------ | ------------------------------------------------------------------------ |
| 200003 | 参数非法（如关闭已支付订单）                                             |
| 300001 | 未登录                                                                   |
| 300006 | 非租户成员，或租户内角色非 OWNER/ADMIN                                   |
| 400001 | 订单不存在（含订单不属于该租户）                                         |
| 500401 | 支付订单不存在                                                           |
| 500402 | 支付订单已关闭                                                           |
| 500403 | 支付订单已过期                                                           |
| 500404 | 支付金额与订单不一致（写 remark，不开通）                                |
| 500405 | 支付渠道不可用（未启用 / 未配置）                                        |
| 500406 | 支付签名校验失败（含跨渠道回调）                                         |
| 500407 | 支付渠道返回错误（下单 / 查单上游失败）                                  |
| 500408 | 档位不可购买（未定价 / 缺配额 / 已定价档位走自助开通）                    |
| 600001 | 数据库错误                                                               |

## 配置

见 [`guide/configuration.md`](../../../guide/configuration.md#支付微信--支付宝) 与 [`config.yaml`](../../../config.yaml)：

- `pay.order_ttl_secs`、`pay.plans`（`amount` 单位分；档位名必须与 `gateway.plan_daily_token_quota` 同名，否则启动失败）
- `pay.wechat.*`：`mch_id` / `app_id` / `api_v3_key`（32 字符）/ `serial_no` / `private_key`（`apiclient_key.pem`）/ `platform_public_key` / `notify_url`（必须 `https://`）/ `api_base`
- `pay.alipay.*`：`app_id` / `private_key` / `alipay_public_key` / `gateway_url` / `notify_url`

**渠道申请（运维 / 商务侧前置条件）**

| 渠道 | 需要准备                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------- |
| 微信 | 微信支付商户号（开通 **Native 支付**）、绑定 appid、APIv3 密钥、商户 API 证书（序列号 + `apiclient_key.pem`）、平台证书公钥、**ICP 备案的公网 HTTPS 回调域名** |
| 支付宝 | 开放平台应用（签约 **当面付**）、应用私钥（RSA2）、支付宝公钥、公网 HTTPS `notify_url`            |

本地开发收不到回调（微信/支付宝无法访问本机）时，用内网穿透或反向代理暴露 `/api/v1/pay/notify/*`，或直接点收银台「刷新支付状态」走 `sync`。

## 对账建议

- 每日按 `paid_at` 导出 `PAID` 订单，与渠道账单核对 `transactionID` / 金额。
- 巡检两类异常订单：`status = PAID AND subscriptionID IS NULL`（已收款未开通）与 `remark` 非空的订单（金额不符 / 迟到支付 / 下单失败）。
- `REFUNDED` 未实现：退款走渠道后台，本模块只保证「已支付订单不可关闭」。
