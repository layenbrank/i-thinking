# Tauri `remote` 配置说明

`remote` 用于定义允许在 Tauri 应用 Webview 中加载的远程 URL，是安全机制的一部分。

配置位置：`apps/client/src-tauri/capabilities/default.json`（`remote.urls`）。

## 主要作用

1. 控制 Webview 可加载的远程 URL：未列入的 URL 会被阻止。
2. 使用 URLPattern：支持通配符与模式匹配（例如 `https://*.baidu.com`）。

## 当前配置

以下摘自当前 capabilities（以仓库文件为准）：

```json
"remote": {
  "urls": [
    "http://*",
    "https://*",
    "http://localhost:*",
    "https://www.baidu.com",
    "https://*.baidu.com",
    "https://cn.bing.com",
    "https://*.bing.com",
    "https://www.youku.com",
    "https://*.youku.com",
    "https://game.weixin.qq.com",
    "https://*.weixin.qq.com"
  ]
}
```

说明：`http://*` / `https://*` 范围很宽，生产环境应收紧为业务必需域名。

## URLPattern 示例

1. 子域名：`"https://*.mydomain.dev"` → 允许 `api.` / `www.` 等子域。
2. 路径：`"https://mydomain.dev/api/*"` → 仅 `api` 下路径。
3. 端口：`"http://localhost:*"` → 任意本地端口。

## 与其他配置的区别

| 配置 | 作用 |
|------|------|
| `remote.urls` | Webview **内**可加载的远程 URL |
| `opener:allow-open-url` | 可在**外部浏览器**打开的 URL |
| `http:default` | 可通过 HTTP API 请求的 URL |

## 安全建议

1. 仅添加必要域名，避免过于宽泛的通配符。
2. 生产环境优先列出具体域名，而不是 `*`。
3. 定期审查允许列表。

## 使用场景

```typescript
// URL 在 remote.urls 中时可加载
const webview = new WebviewWindow('navigation', {
  url: 'https://www.youku.com'
})

// 不在列表中则被阻止
const webview2 = new WebviewWindow('other', {
  url: 'https://www.example.com'
})
```
