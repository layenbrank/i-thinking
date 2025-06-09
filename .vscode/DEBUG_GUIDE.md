# Vue3 + Vite + TypeScript + SCSS VSCode 调试配置指南

## 📋 配置概述

本项目已完整配置了适用于 **Turborepo Monorepo** 架构的 Vue3 + Vite + TypeScript + SCSS 开发环境的 VSCode 调试功能，支持多应用并行开发和调试。

## 🗂️ 配置文件结构

```
.vscode/
├── launch.json     # 调试启动配置
├── tasks.json      # 任务配置（启动开发服务器等）
├── settings.json   # 工作区设置
└── DEBUG_GUIDE.md  # 本指南文档
```

---

## 🚀 调试配置 (launch.json)

### 可用的调试配置

#### 1. Desktop-D Debug Development (推荐)

**主要桌面应用调试配置**

- **端口**: `http://localhost:10010`
- **自动启动**: ✅ 会自动启动开发服务器
- **适用场景**: 首次调试或开发服务器未启动时使用

#### 2. Desktop-D (快速启动)

**快速调试配置**

- **端口**: `http://localhost:10010`
- **自动启动**: ❌ 不启动服务器
- **适用场景**: 开发服务器已运行时使用，启动更快

#### 3. Desktop-G Debug Development

**桌面应用G版本调试**

- **端口**: `http://localhost:10011`
- **应用路径**: `apps/desktop-g`

#### 4. Extension Debug Development

**浏览器扩展调试**

- **端口**: `http://localhost:10012`
- **应用路径**: `apps/extension`

#### 5. DevTools Debug Development

**开发者工具调试**

- **端口**: `http://localhost:10013`
- **应用路径**: `apps/devtools`

### 核心配置字段详解

#### 基础配置

```json
{
  "type": "chrome", // 调试器类型，使用Chrome DevTools
  "name": "Desktop-D Debug Development", // 配置显示名称
  "request": "launch", // 启动模式（launch/attach）
  "url": "http://localhost:10010", // 调试目标URL
  "env": { "NODE_ENV": "development" } // 环境变量设置
}
```

#### 源码映射配置

```json
"sourceMaps": true,                    // 启用源码映射支持
"webRoot": "${workspaceFolder}/apps/desktop-d", // Web根目录
```

#### 预启动任务

```json
"preLaunchTask": "pnpm dev:desktop-d", // 调试前执行的任务
```

#### 源码路径映射 (sourceMapPathOverrides)

**关键配置项**，将编译后的路径映射回源码路径：

```json
"sourceMapPathOverrides": {
  ".vite/deps/*": "${webRoot}/node_modules/.vite/deps/*",     // Vite依赖预构建文件
  ".tmp": "${webRoot}/node_modules/.tmp/*",                   // 临时文件映射
  "@slide": "${webRoot}/node_modules/@slide/*",               // @slide包映射
  "/@fs/*": "${webRoot}/*",                                   // Vite文件系统路径
  "/*": "${webRoot}/*",                                       // 根路径映射
  "/src/*": "${webRoot}/src/*",                              // src目录映射
  "/@/*": "${webRoot}/src/*",                                // @别名映射（指向src）
  "/@vite/*": "${workspaceFolder}/node_modules/*",          // Vite模块映射
  "/./*": "${webRoot}/*",                                    // 相对路径映射
  "/components/*": "${webRoot}/src/components/*",            // 组件目录映射
  "/node_modules/*": "${workspaceFolder}/node_modules/*",   // node_modules映射
  "/@id/*": "${webRoot}/src/*",                             // Vite模块ID映射
  "/@id/.*": "${webRoot}/src/*"                             // Vite模块ID正则映射
}
```

#### 调试优化设置

```json
"smartStep": true,                     // 智能步进，跳过不重要的代码
"resolveSourceMapLocations": [         // 源码映射解析范围
  "${workspaceFolder}/**",             // 允许整个工作区
  "!**/node_modules/.vite/deps/**",    // 排除Vite预构建缓存
  "!**/node_modules/*/**"              // 排除第三方模块
],
"skipFiles": [                         // 调试时跳过的文件
  "<node_internals>/**",               // Node.js内部模块
  "${workspaceFolder}/node_modules/**/*.js", // 第三方模块JS文件
  "**/node_modules/.vite/deps/**",     // Vite预构建文件
  "${workspaceFolder}/dist/desktop-d/**" // 构建输出目录
]
```

---

## ⚙️ 任务配置 (tasks.json)

### 任务类型

#### 开发服务器任务

```json
{
  "type": "shell", // 任务类型：shell命令
  "command": "pnpm", // 执行命令
  "args": ["run", "dev:desktop-d"], // 命令参数
  "label": "pnpm dev:desktop-d", // 任务标签（供launch.json引用）
  "detail": "启动 Desktop-D 应用开发服务器", // 任务描述
  "isBackground": true // 后台运行任务
}
```

#### 问题匹配器 (problemMatcher)

**用于检测任务完成状态**：

```json
"problemMatcher": {
  "owner": "custom",                   // 问题匹配器所有者
  "pattern": {                         // 错误模式匹配
    "regexp": ".",                     // 正则表达式
    "file": 1,                         // 文件名组号
    "location": 2,                     // 位置组号
    "message": 3                       // 消息组号
  },
  "background": {                      // 后台任务模式
    "activeOnStart": true,             // 启动时激活
    "beginsPattern": ".",              // 开始模式
    "endsPattern": "ready in"          // 结束模式（Vite特有）
  }
}
```

### 特殊任务配置

#### Service应用任务

```json
"background": {
  "endsPattern": "Application successfully started" // NestJS/服务器特有结束模式
}
```

#### 构建任务

```json
{
  "group": "build", // 任务组（构建类）
  "problemMatcher": [] // 空问题匹配器（同步任务）
}
```

---

## 🛠️ 工作区设置 (settings.json)

### Vue开发优化

```json
"vue.server.hybridMode": true,        // Vue语言服务混合模式
"vue.inlayHints.inlineHandlerLeading": true, // 内联处理器提示
"vue.updateImportsOnFileMove.enabled": true, // 文件移动时更新导入
```

### TypeScript配置

```json
"typescript.preferences.importModuleSpecifier": "relative", // 相对路径导入
"typescript.suggest.autoImports": true,    // 自动导入建议
"typescript.updateImportsOnFileMove.enabled": "always", // 移动文件时更新导入
```

### 调试优化

```json
"debug.javascript.unmapMissingSources": true,     // 取消映射缺失源码
"debug.javascript.suggestPrettyPrinting": false,  // 不建议美化打印
```

### SCSS支持

```json
"scss.lint.duplicateProperties": "warning",       // SCSS重复属性警告
"css.lint.duplicateProperties": "warning",        // CSS重复属性警告
```

---

## 🎯 使用指南

### 启动调试

#### 方式一：自动启动（推荐）

1. 按 `Ctrl+Shift+D` 打开调试面板
2. 选择 `Desktop-D Debug Development` 配置
3. 按 `F5` 或点击绿色播放按钮
4. 等待开发服务器启动和浏览器打开

#### 方式二：手动启动后调试

1. 终端运行：`pnpm dev:desktop-d`
2. 等待看到 `ready in` 输出
3. 选择 `Desktop-D (快速启动)` 配置
4. 按 `F5` 开始调试

### 断点调试

#### Vue组件调试

- **`.vue` 文件**: 在 `<script>` 部分设置断点
- **`.ts` 文件**: 直接在代码行点击设置断点
- **组合式API**: 支持 `setup()` 函数内断点
- **响应式数据**: 可以监视 `ref`、`reactive` 等响应式变量

#### 路径映射验证

断点设置后，检查调试器是否正确映射到源码：

- ✅ 显示原始TypeScript代码
- ✅ 变量名未被混淆
- ✅ 可以编辑并保存文件
- ❌ 如果显示编译后的JS代码，检查sourceMapPathOverrides配置

### 多应用调试

#### 并行调试多个应用

1. 启动第一个应用调试会话
2. 在调试面板点击 `+` 按钮
3. 选择另一个应用的调试配置
4. 现在可以同时调试多个应用

#### 切换调试目标

- 在调试面板的下拉菜单中切换不同的调试会话
- 每个会话有独立的断点和变量监视

---

## 🐛 故障排除

### 常见问题

#### 1. 断点不生效

**症状**: 断点呈灰色，无法命中
**解决方案**:

- 检查 `vite.config.ts` 中 `sourcemap: true` 已启用
- 验证 `sourceMapPathOverrides` 路径映射是否正确
- 清理 `node_modules/.vite` 缓存并重启

#### 2. 路径映射错误

**症状**: 断点跳转到错误的文件或显示编译后代码
**解决方案**:

- 检查 `webRoot` 配置是否指向正确的应用目录
- 验证 `@` 别名映射: `"/@/*": "${webRoot}/src/*"`
- 确认工作区根目录设置正确

#### 3. 开发服务器启动失败

**症状**: 调试启动时任务失败
**解决方案**:

- 检查端口是否被占用: `netstat -ano | findstr :10010`
- 确认依赖已安装: `pnpm install`
- 查看终端错误信息进行具体排查

#### 4. 源码映射缺失

**症状**: Variables显示 `<不可用>` 或 `undefined`
**解决方案**:

- 确保构建模式为开发模式 (`NODE_ENV=development`)
- 检查 Vite 配置中的 `sourcemap` 设置
- 验证 `resolveSourceMapLocations` 包含正确路径

### 高级调试技巧

#### 变量监视

```javascript
// 在监视面板添加表达式
this.$route.params // Vue Router参数
this.$store.state // Vuex/Pinia状态
process.env.NODE_ENV // 环境变量
window.location.href // 当前URL
```

#### 条件断点

- 右键断点 → 编辑断点
- 添加条件表达式，如: `user.id === 123`
- 只有满足条件时才会暂停

#### 日志断点

- 右键断点 → 编辑断点
- 选择"日志消息"而非"暂停执行"
- 在不中断代码执行的情况下输出日志

---

## 📁 项目结构

```
turborepo-itab/
├── apps/                           # 应用目录
│   ├── desktop-d/                  # 主桌面应用
│   │   ├── src/
│   │   │   ├── components/         # Vue组件
│   │   │   ├── views/             # 页面视图
│   │   │   ├── stores/            # Pinia状态管理
│   │   │   ├── types/             # TypeScript类型
│   │   │   └── styles/            # SCSS样式
│   │   ├── vite.config.ts         # Vite配置
│   │   └── package.json
│   ├── desktop-g/                  # 桌面应用G版本
│   ├── extension/                  # 浏览器扩展
│   ├── devtools/                   # 开发者工具
│   └── service/                    # 后端服务
├── packages/                       # 共享包
│   ├── core/                       # 核心逻辑
│   ├── ui/                         # UI组件库
│   └── shared/                     # 共享工具
├── .vscode/                        # VSCode配置
│   ├── launch.json                 # 调试配置
│   ├── tasks.json                  # 任务配置
│   ├── settings.json               # 工作区设置
│   └── DEBUG_GUIDE.md              # 本指南
├── dist/                           # 构建输出
│   ├── desktop-d/                  # Desktop-D构建产物
│   └── desktop-g/                  # Desktop-G构建产物
└── turbo.json                      # Turborepo配置
```

---

## 🎉 开始调试

配置已完成！选择任一调试配置，按 `F5` 开始您的 Vue3 调试之旅！

**推荐工作流程**:

1. 🚀 使用 `Desktop-D Debug Development` 启动主应用调试
2. 🔍 在 Vue 组件中设置断点
3. 🌐 在浏览器中操作触发断点
4. 🛠️ 使用调试面板检查变量、调用堆栈
5. ⚡ 利用热重载快速迭代开发

Happy Debugging! 🎯
