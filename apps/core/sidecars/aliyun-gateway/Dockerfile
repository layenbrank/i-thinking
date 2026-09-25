# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /src
# 容器内无法直连 proxy.golang.org，改用国内模块代理（无代理环境）
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /aliyun-gateway ./command/server

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget

WORKDIR /app
COPY --from=builder /aliyun-gateway /app/aliyun-gateway

ENV CONFIG=/app/config.json
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -q --spider http://127.0.0.1:8090/healthz || exit 1

ENTRYPOINT ["/app/aliyun-gateway"]
