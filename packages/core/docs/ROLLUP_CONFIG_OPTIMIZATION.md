# Rollup 配置优化说明

## 优化重点

### 1. **index.js 和 index.d.ts 只包含重新导出**

- ✅ `dist/index.js` 只有 3 行重新导出语句
- ✅ `dist/index.d.ts` 只有 3 行类型重新导出
- ✅ 避免了将所有代码重复打包到 index 文件中

**生成结果**:

```javascript
// dist/index.js
export * from './directives'
export * from './hooks'
export * from './utils'
```

### 2. **路径重写插件**

通过自定义 `rewriteExportPaths` 插件,自动将源代码中的:

- `'./directives/index'` → `'./directives'`
- `'./hooks/index'` → `'./hooks'`
- `'./utils/index'` → `'./utils'`

这样在使用时可以正确找到扁平化的文件结构。

### 3. **优雅的变量命名**

- `npmDependencies`: 明确表示是 npm 包依赖
- `shouldExternalize`: 清晰的函数命名
- `buildJavaScript` / `buildTypeDeclaration`: 语义化的构建函数
- `subModulePaths`: 子模块路径列表

### 4. **精确的依赖外部化**

使用包名匹配而不是路径匹配:

```typescript
const npmDependencies: RegExp[] = [
  /^vue$/,
  /^vue\//,
  /^pinia$/,
  /^rxjs$/
  // ...
]
```

### 5. **差异化的压缩策略**

- `index.js`: **不压缩**(只是重新导出,无需压缩)
- `directives.js`, `hooks.js`, `utils.js`: **压缩**

### 6. **代码复用**

通过 `buildJavaScript` 和 `buildTypeDeclaration` 函数封装构建逻辑,减少重复代码。

## 构建产物

```
dist/
├── index.js          # 3 行重新导出(未压缩)
├── index.d.ts        # 3 行类型重新导出
├── directives.js     # 压缩后的代码
├── directives.d.ts   # 类型定义
├── hooks.js          # 压缩后的代码
├── hooks.d.ts        # 类型定义
├── utils.js          # 压缩后的代码
└── utils.d.ts        # 类型定义
```

## 使用效果

```typescript
// ✅ 可以正常导入主入口
import { useDeferredRender } from '@i-thinking/core'

// ✅ 可以正常导入子模块
import { useWheel } from '@i-thinking/core/hooks'

// ✅ 类型定义正确解析
// TypeScript 会自动找到 ./directives.d.ts, ./hooks.d.ts, ./utils.d.ts
```

## 优化总结

| 项目          | 优化前                             | 优化后                          |
| ------------- | ---------------------------------- | ------------------------------- |
| index.js 大小 | ~40KB(包含所有代码)                | 78 字节(只有导出)               |
| 路径解析      | ❌ `./directives/index` 找不到文件 | ✅ `./directives` 正确解析      |
| 代码压缩      | 所有文件统一处理                   | 差异化策略                      |
| 配置可读性    | 重复代码多                         | 函数封装,清晰简洁               |
| 变量命名      | externals, paths                   | npmDependencies, subModulePaths |
