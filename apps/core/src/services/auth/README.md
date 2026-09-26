# Auth 模块

用户认证与个人资料自助管理。路由前缀 `/api/v1/auth`。

## 概述

| 能力        | 说明                                                            |
| ----------- | --------------------------------------------------------------- |
| 登录 / 注册 | 公开接口，返回 JWT（含 `role` 声明，仅作快速拒绝）；注册默认 `USER` + `ACTIVE` |
| 行为验证码  | go-captcha-service 侧车；`POST /captcha` 取题，`captchaKey` 校验 |
| OTP         | 手机/邮箱一次性验证码登录或发码防刷                               |
| 找回/重置密码 | username 或 channel+target 发 OTP，OTP 一步重置新密码           |
| 修改密码    | 已登录用户改密（与 profile 分离），成功后吊销当前 JWT             |
| 登出        | JWT 写入 Redis 黑名单，直至原 token 过期                        |
| Profile     | 当前用户读/改个人信息（email、phone、gender、birthday、avatar） |

**与 user 模块区别**：auth 面向**当前登录用户**；[`user`](../user/README.md) 面向**后台管理员** CRUD 任意用户。

## 路由一览

| 方法 | 路径                   | 鉴权 | 说明         |
| ---- | ---------------------- | ---- | ------------ |
| POST | `/api/v1/auth/captcha` | 无   | 获取行为验证码（滑块等） |
| POST | `/api/v1/auth/otp`     | 无   | 发送 OTP（须 captcha） |
| POST | `/api/v1/auth/signin`  | 无   | 密码登录     |
| POST | `/api/v1/auth/signup`  | 无   | 注册         |
| POST | `/api/v1/auth/signin/phone` | 无 | 手机 OTP 登录 |
| POST | `/api/v1/auth/signin/email` | 无 | 邮箱 OTP 登录 |
| POST | `/api/v1/auth/password/forgot` | 无 | 找回密码（发 OTP，须 captcha） |
| POST | `/api/v1/auth/password/reset` | 无 | 重置密码（OTP + newPassword） |
| PUT  | `/api/v1/auth/password` | JWT | 修改密码（oldPassword + newPassword） |
| GET  | `/api/v1/auth/profile` | JWT  | 获取个人信息 |
| PUT  | `/api/v1/auth/profile` | JWT  | 更新个人信息 |
| POST | `/api/v1/auth/signout` | JWT  | 登出（Redis 黑名单） |

## 行为验证码（go-captcha）

后端代理 [go-captcha-service](http://gocaptcha.wencodes.com/service/)（Docker 服务 `gocaptcha`），**不是** hCaptcha SaaS。

### 前端（`go-captcha-react`）

```bash
npm install go-captcha-react
```

```tsx
import GoCaptcha from 'go-captcha-react'

// 1. POST /api/v1/auth/captcha → data 填入 GoCaptcha.Slide data
// 2. on confirm → captchaValue（滑块 X）
// 3. signin 提交 captchaKey + captchaValue
```

| 对比 | go-captcha（本仓库） | hCaptcha |
| ---- | -------------------- | -------- |
| 前端库 | `go-captcha-react` | `@hcaptcha/react-hcaptcha` |
| 提交字段 | `captchaKey` + `captchaValue` | `h-captcha-response` token |
| 后端 | 代理侧车 `check-data` | `api.hcaptcha.com/siteverify` |

### 联调顺序

1. `docker compose up -d gocaptcha redis`
2. `POST /api/v1/auth/captcha`（可选 body `{"kind":"slide-default"}`）
3. 完成滑块 → `POST /api/v1/auth/signin` 带 `captchaKey`、`captchaValue`

配置见 [`guide/configuration.md`](../../../guide/configuration.md) 中 `auth.captcha.*`。

**终端联调**：development 下 `auth.captcha.enabled: false`（见 `config.development.yaml`）时跳过校验，请求里仍可填占位：

```json
{ "captchaKey": "dev", "captchaValue": "0" }
```

生产环境禁止关闭。

## OTP 短信（aliyun-gateway）

| 模式 | 行为 |
| ---- | ---- |
| `auth.otp.mock: true`（开发默认） | 验证码写入日志，不调用侧车 |
| `auth.otp.mock: false` + 手机 | `OtpService` → `AliyunGatewayClient` → `POST /api/v1/sms/send` |
| `auth.otp.mock: false` + 邮箱 | 返回发送失败（DirectMail 待接入） |

联调：`docker compose up -d aliyun-gateway`，配置 `docker/aliyun-gateway/config.local.json` 中的 AK/SK 与短信签名。

## 鉴权说明

- `signin` / `signup` / `captcha` / `otp` / `password/forgot` / `password/reset`：无 JWT
- `profile` / `password` / `signout`：挂载 [`Auth::required()`](../../guards/auth.rs)
- Auth 路由受 `governor` IP 限流（`auth.rate_limit`），超限 `code=200005`
- 未登录返回 `300001`；已登出 token 返回 `300002`

## 接口示例

### POST /api/v1/auth/signin

```json
{
  "username": "admin",
  "password": "123456",
  "captchaKey": "xxxx-xxxxx",
  "captchaValue": "120"
}
```

须先调用 `POST /api/v1/auth/captcha` 获取拼图与 `captchaKey`。

---

源码：[`module.rs`](module.rs) · [`controller.rs`](controller.rs) · [`service.rs`](service.rs) · [`schema.rs`](schema.rs) · [`captcha.rs`](captcha.rs)
