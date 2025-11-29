# Vitest 测试指南

本项目采用 monorepo 架构，每个子项目都有独立的 vitest 配置。

## 📁 项目测试配置

### 已配置 Vitest 的项目

#### Apps

- **apps/client** - React + Tauri 桌面应用
- **apps/devtools** - Vue3 开发工具
- **apps/extension** - Vue3 浏览器扩展

#### Packages

- **packages/core** - 核心工具库
- **packages/ui** - Vue3 组件库

#### 不使用 Vitest 的项目

- **apps/service** - NestJS 后端服务（使用 Jest）
- **apps/docs** - VitePress 文档站点（不需要测试）
- **packages/shared** - 仅类型定义（不需要测试）

---

## 🚀 运行测试

### 在根目录运行所有测试

```bash
# 运行所有项目的测试
pnpm test

# 运行带 UI 的测试
pnpm test:ui

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 在单个项目中运行测试

```bash
# 进入项目目录
cd apps/client

# 运行测试
pnpm test

# 监听模式运行测试
pnpm test --watch

# 运行带 UI 的测试
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage
```

---

## 📝 编写测试

### 1. React 组件测试 (apps/client)

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from './Button'

describe('Button Component', () => {
	it('renders button with text', () => {
		render(<Button>Click me</Button>)
		expect(screen.getByText('Click me')).toBeInTheDocument()
	})

	it('handles click events', async () => {
		const handleClick = vi.fn()
		render(<Button onClick={handleClick}>Click me</Button>)

		const button = screen.getByText('Click me')
		await userEvent.click(button)

		expect(handleClick).toHaveBeenCalledTimes(1)
	})
})
```

### 2. Vue 组件测试 (apps/extension, apps/devtools, packages/ui)

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from './MyComponent.vue'

describe('MyComponent', () => {
	it('renders properly', () => {
		const wrapper = mount(MyComponent, {
			props: { msg: 'Hello Vitest' }
		})
		expect(wrapper.text()).toContain('Hello Vitest')
	})

	it('emits event on button click', async () => {
		const wrapper = mount(MyComponent)
		await wrapper.find('button').trigger('click')
		expect(wrapper.emitted()).toHaveProperty('click')
	})
})
```

### 3. 工具函数测试 (packages/core)

```ts
import { describe, it, expect } from 'vitest'
import { formatDate, validateEmail } from './utils'

describe('Utils', () => {
	describe('formatDate', () => {
		it('formats date correctly', () => {
			const date = new Date('2024-01-01')
			expect(formatDate(date)).toBe('2024-01-01')
		})
	})

	describe('validateEmail', () => {
		it('validates correct email', () => {
			expect(validateEmail('test@example.com')).toBe(true)
		})

		it('rejects invalid email', () => {
			expect(validateEmail('invalid-email')).toBe(false)
		})
	})
})
```

### 4. Composables 测试 (Vue 项目)

```ts
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
	it('increments counter', () => {
		const { count, increment } = useCounter()
		expect(count.value).toBe(0)

		increment()
		expect(count.value).toBe(1)
	})
})
```

### 5. Mock 测试

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchData } from './api'

// Mock 模块
vi.mock('./api', () => ({
	fetchData: vi.fn()
}))

describe('API calls', () => {
	it('fetches data successfully', async () => {
		const mockData = { id: 1, name: 'Test' }
		vi.mocked(fetchData).mockResolvedValue(mockData)

		const result = await fetchData()
		expect(result).toEqual(mockData)
	})
})
```

---

## 📦 测试文件组织

### 推荐的文件结构

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   └── Input/
│       ├── Input.vue
│       └── Input.spec.ts
├── utils/
│   ├── helpers.ts
│   └── helpers.test.ts
└── hooks/
    ├── useCounter.ts
    └── useCounter.test.ts
```

### 测试文件命名规则

- `*.test.ts` - 单元测试
- `*.test.tsx` - React 组件测试
- `*.spec.ts` - 规范测试（可选）
- `*.spec.tsx` - React 组件规范测试（可选）

---

## 🔧 Vitest 配置说明

每个项目的 `vitest.config.ts` 包含：

```typescript
export default defineConfig({
	plugins: [vue()], // 或 react()
	test: {
		globals: true, // 启用全局 API
		environment: 'jsdom', // DOM 环境（组件测试）
		coverage: {
			provider: 'v8', // 覆盖率提供者
			reporter: ['text', 'json', 'html']
		},
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'dist', '.turbo']
	}
})
```

---

## 🎯 测试最佳实践

1. **测试文件应与源文件放在同一目录**
   - 便于查找和维护
   - 保持代码和测试的紧密关联

2. **使用描述性的测试名称**

   ```ts
   it('should validate email format correctly')
   // 优于
   it('test email')
   ```

3. **遵循 AAA 模式**
   - Arrange（准备）
   - Act（执行）
   - Assert（断言）

4. **不要测试实现细节**
   - 测试行为，而不是内部实现
   - 从用户角度编写测试

5. **使用 Mock 隔离依赖**
   - 保持测试独立性
   - 提高测试速度

6. **保持测试简单**
   - 一个测试只测一个功能点
   - 避免复杂的测试逻辑

---

## 📊 覆盖率报告

运行覆盖率测试后，在各项目的 `coverage/` 目录下查看报告：

```bash
# 生成覆盖率报告
pnpm test:coverage

# 查看 HTML 报告
# 在浏览器中打开 coverage/index.html
```

---

## 🔍 常用 API

### Vitest 核心 API

- `describe()` - 测试套件
- `it()` / `test()` - 测试用例
- `expect()` - 断言
- `vi.fn()` - 创建 mock 函数
- `vi.mock()` - Mock 模块
- `beforeEach()` / `afterEach()` - 钩子函数

### React Testing Library

- `render()` - 渲染组件
- `screen` - 查询渲染结果
- `fireEvent` - 触发事件
- `waitFor()` - 等待异步操作

### Vue Test Utils

- `mount()` - 挂载组件
- `shallowMount()` - 浅挂载
- `wrapper.find()` - 查找元素
- `wrapper.trigger()` - 触发事件
- `wrapper.emitted()` - 获取触发的事件

---

## 💡 示例项目

查看各项目中的 `src/example.test.ts(x)` 文件获取更多示例：

- `apps/client/src/example.test.tsx` - React 测试示例
- `apps/extension/src/example.test.ts` - Vue 测试示例
- `packages/ui/src/example.test.ts` - UI 组件测试示例
- `packages/core/src/example.test.ts` - 工具函数测试示例

---

## 📚 参考资料

- [Vitest 官方文档](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
