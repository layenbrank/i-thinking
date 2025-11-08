# 环境变量配置说明

本文档列出了项目所需的所有环境变量及其说明。

## 必需的环境变量

### 服务器配置

```env
# 服务器监听地址（默认: 127.0.0.1）
HOST=127.0.0.1

# 服务器监听端口（默认: 3000）
PORT=3000
```

### MongoDB 数据库配置

```env
# MongoDB 连接字符串
# 格式: mongodb://[username:password@]host[:port][/database][?options]
# 示例: mongodb://localhost:27017
# 示例（带认证）: mongodb://user:pass@localhost:27017/mydb
# 默认: mongodb://localhost:27017
MONGODB_URI=mongodb://localhost:27017
```

### Auth 认证系统配置

```env
# 密码加密方式
# 可选值: aes 或 argon2
# - argon2: 推荐使用，更安全，无需额外密钥
# - aes: 对称加密，需要设置 AES_KEY
# 默认: argon2
Encryption=argon2

# JWT Token 密钥
# 要求: 至少 32 字符，建议 64 字符
# 生成方法: cargo run --bin generate_keys
# 注意: 生产环境请使用强随机密钥，不要使用默认值
JWT_SECRET=your-jwt-secret-key-should-be-at-least-32-characters-long

# AES 加密密钥（仅当 Encryption=aes 时需要）
# 要求: 32 字节的 base64 编码字符串
# 生成方法: cargo run --bin generate_keys
# 注意: 如果使用 argon2，此配置可选
AES_KEY=
```

### 通用密钥配置

```env
# 通用密钥（用于其他加密场景，可选）
# 默认: secret
SECRET=your-secret-key
```

## 可选的环境变量

### 日志配置

```env
# Rust 日志级别
# 可选值: error, warn, info, debug, trace
# 默认: info
RUST_LOG=info
```

## 完整的 .env 文件示例

```env
# ============================================
# 服务器配置
# ============================================
HOST=127.0.0.1
PORT=3000

# ============================================
# MongoDB 数据库配置
# ============================================
MONGODB_URI=mongodb://localhost:27017

# ============================================
# 通用密钥配置
# ============================================
SECRET=your-secret-key

# ============================================
# Auth 认证系统配置
# ============================================
Encryption=argon2
JWT_SECRET=your-jwt-secret-key-should-be-at-least-32-characters-long
AES_KEY=

# ============================================
# 日志配置（可选）
# ============================================
# RUST_LOG=info
```

## 生成密钥

项目提供了密钥生成工具，运行以下命令生成所有必需的密钥：

```bash
cargo run --bin generate_keys
```

该命令会输出：
- `JWT_SECRET`: 64 字符的随机字符串，用于 JWT token 签名和验证
- `AES_KEY`: 32 字节的随机密钥（base64 编码），用于 AES-256-GCM 加密

## 手动生成密钥的方法

### 生成 JWT_SECRET（至少 32 字符）

**PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) + (33..47) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**或使用 OpenSSL（如果已安装）:**
```bash
openssl rand -base64 48
```

### 生成 AES_KEY（32 字节的 base64 编码）

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**或使用 OpenSSL:**
```bash
openssl rand -base64 32
```

## 重要提示

1. **不要将 `.env` 文件提交到版本控制系统**（确保已在 `.gitignore` 中）
2. **生产环境请使用安全的密钥管理方式**（如密钥管理服务）
3. **定期轮换密钥以提高安全性**
4. **如果使用 AES 加密方式，必须设置 `AES_KEY`**；如果使用 Argon2，`AES_KEY` 是可选的
5. **JWT_SECRET 必须至少 32 字符**，建议使用 64 字符的强随机字符串

## 快速开始

1. 复制配置示例到 `.env` 文件
2. 运行 `cargo run --bin generate_keys` 生成密钥
3. 将生成的密钥复制到 `.env` 文件中
4. 根据实际情况修改其他配置项
5. 启动应用：`cargo run`


# 服务器配置
HOST=127.0.0.1
PORT=3000

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017

# 通用密钥
SECRET=your-secret-key

# Auth 认证系统配置
Encryption=argon2
JWT_SECRET=你的JWT密钥（使用 cargo run --bin generate_keys 生成）
AES_KEY=你的AES密钥（使用 cargo run --bin generate_keys 生成，仅当使用 AES 时需要）

# 日志配置（可选）
# RUST_LOG=info