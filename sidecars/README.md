# Sidecars（Go 侧车）

本目录存放**自研 Go 服务**，用于封装没有官方 Rust SDK 的云 API。Rust 主服务通过 HTTP 调用，不直接持有云厂商 AK/SK。

当前子项目：

| 目录 | 说明 | 端口 |
|------|------|------|
| [`aliyun-gateway/`](aliyun-gateway/) | 阿里云 SMS / OSS / 邮件网关 | 8090 |

与 Rust 的协作方式见 [`guide/integrations.md`](../guide/integrations.md)。

---

## 给 JS / Rust 开发者的 Go 速查

你已熟悉 JavaScript 和 Rust，下面用对照表说明 Go 在本仓库里的用法。

### 生态对照

| 概念 | JavaScript | Rust | Go（本仓库） |
|------|------------|------|--------------|
| 包清单 | `package.json` | `Cargo.toml` | [`go.mod`](aliyun-gateway/go.mod) |
| 锁文件 | `bun.lock` / `package-lock` | `Cargo.lock` | `go.sum` |
| 包市场 | [npmjs.com](https://www.npmjs.com) | [crates.io](https://crates.io) | [pkg.go.dev](https://pkg.go.dev) |
| 安装依赖 | `bun install` | `cargo build`（自动拉取） | `go mod download` 或首次 `go build` |
| 加依赖 | `bun add xxx` | `cargo add xxx` | `go get github.com/xxx@v1.2.3` |
| 整理依赖 | — | — | `go mod tidy` |
| 运行 | `bun run dev` | `cargo run` | `go run ./command/server` |
| 编译 | — | `cargo build` | `go build -o aliyun-gateway.exe ./command/server` |
| 测试 | `bun test` | `cargo test` | `go test ./...` |
| 模块名 | `@scope/pkg` | `crate_name` | `module corex/aliyun-gateway`（`go.mod` 第一行） |
| 私有代码 | — | `pub` / `pub(crate)` | `internal/` 包外**不可** import |
| 程序入口 | `src/index.ts` | `src/bin/*.rs` | `command/server/main.go` |

> **为何用 `command/` 而不是 `cmd/`？**  
> Go 社区惯例目录名是 `cmd/`（command 缩写）。本仓库用 `command/` 是为了表意更直观；读外部 Go 项目文档时看到 `cmd/` 即等同于这里的 `command/`。

### 常用命令

在子项目目录下执行（以 `aliyun-gateway` 为例）：

```powershell
cd sidecars/aliyun-gateway

go version              # 验证已安装，需 >= 1.22
go mod download         # 下载依赖
go test ./...           # 运行所有包的单测
go run ./command/server # 本地启动（需设置 CONFIG，见子项目 README）
go build -o aliyun-gateway.exe ./command/server
```

国内网络拉依赖慢时：

```powershell
$env:GOPROXY = "https://goproxy.cn,direct"
go mod download
```

### 目录结构（对照 Rust）

```
sidecars/aliyun-gateway/
  command/server/main.go   # 入口，类似 src/bin/service.rs
  internal/              # 私有实现，外部项目不能 import
    config/              # 配置加载
    handler/             # HTTP 处理（类似 controller）
    middleware/          # 中间件（类似 Actix wrap）
    server/              # 路由注册
    service/sms/         # 业务 / SDK 封装
  go.mod / go.sum
  Dockerfile
```

`docker/aliyun-gateway/` 存放侧车 JSON 配置（含 AK/SK 的 `config.local.json` 不入库）。

### 第一次改 sidecar 读什么

1. 本文件（生态对照 + 命令）
2. 子项目 [`aliyun-gateway/README.md`](aliyun-gateway/README.md)（架构、配置、排错）
3. [`guide/integrations.md`](../guide/integrations.md)（与 Rust 的边界与规则）

### 新增 sidecar 检查清单

- [ ] `sidecars/<name>/` + `go.mod`
- [ ] `command/<bin>/main.go` + `internal/`
- [ ] `docker/<name>/config.json` + `.example` 密钥文件
- [ ] [`docker-compose.yml`](../docker-compose.yml) 服务项
- [ ] Rust `src/clients/<name>.rs` + `config.yaml` 连接字段
- [ ] [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) `go test` / `go build` job
- [ ] 更新 [`guide/integrations.md`](../guide/integrations.md)
