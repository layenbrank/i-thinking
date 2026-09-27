# core（Rust）镜像：service / worker / orchestrator / migration 四个二进制共用一个镜像，
# 由 compose 用 command 选择跑哪一个。
#
# 构建（上下文必须是 apps/core）：
#   docker compose build core-api
#   docker build -t corex-core:local -f docker/core/Dockerfile .

# ------------------------------- 构建段 -------------------------------
FROM rust:1.98-bookworm AS builder

# sea-orm 走 runtime-tokio-native-tls ⇒ 需要 OpenSSL 头文件与 pkg-config 才能编译 openssl-sys。
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# `.cargo/` 已被 .dockerignore 排除，容器内是干净的 Cargo 默认配置（见 .dockerignore 的说明）。
COPY . .

# --locked：Cargo.lock 是真相，镜像里不允许静默升级依赖。
# --workspace 不能省：workspace 根同时是 `service` 包，不带它只会构建当前这一个包，
# `migration` 的二进制就不会出现在 target/release 里。
RUN cargo build --release --locked --workspace --bins \
    && strip target/release/service target/release/worker target/release/orchestrator target/release/migration

# ------------------------------- 运行段 -------------------------------
FROM debian:bookworm-slim AS runtime

# ca-certificates：出站 HTTPS（模型供应商、阿里云、支付渠道）
# libssl3：native-tls 的运行时依赖
# curl：compose healthcheck 打 /api/live 与 /api/ready
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

WORKDIR /app

COPY --from=builder \
    /build/target/release/service \
    /build/target/release/worker \
    /build/target/release/orchestrator \
    /build/target/release/migration \
    /app/

# configures/src/loader.rs 的 config_dir() 优先用可执行文件所在目录，所以配置必须与二进制同目录，
# 否则容器里读不到 config.yaml。密钥与地址由 compose 的 CORE__* 环境变量覆盖，不写死在这里。
COPY config.yaml config.development.yaml config.production.yaml /app/

# bootstrap/static_assets.rs 用 actix_files 把 `guide` 挂到 /guide，它在构造时就要求这个相对路径是
# 目录，不存在会按 ERROR 打日志（看起来像启动失败，其实不是）。放一个空目录：既不报错，也不把
# 仓库里的 guide/*.md 打进镜像（内部文档不随镜像分发）。
RUN mkdir -p /app/logs /app/guide && chown -R app:app /app
USER app

EXPOSE 3000
CMD ["./service"]
