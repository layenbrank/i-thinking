# vite.config.ts

## unplugin-icons

```ts
import { fileURLToPath, URL } from 'node:url'
import { dirname, resolve } from 'node:path'

import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

export default defineConfig(function (): UserConfig {
  return {
    plugins: [
      vue(),
      vueJsx(),
      Icons({
        // 指定使用 Vue3 编译器
        compiler: 'vue3',
        // 自动安装缺少的图标集
        autoInstall: true,
        // 图标默认缩放比例
        scale: 1,
        // 默认样式
        defaultStyle: '',
        // 默认 CSS 类
        defaultClass: '',
        // jsx 支持
        jsx: 'react',
        // 自定义图标集合
        customCollections: {
          // 'local' 是自定义集合名称，可以改为任何你喜欢的名称
          // 本地 SVG 图标文件夹路径
          local: FileSystemIconLoader('./src/assets/icons', function (svg) {
            return svg.replace(/^<svg /, '<svg fill="currentColor" ')
          })
        }
      }),
      AutoImport({
        resolvers: [NaiveUiResolver()],
        dts: 'src/types/auto-imports.d.ts',
        include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
        imports: [
          'vue',
          'vue-router',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
          }
        ]
      }),
      Components({
        resolvers: [
          // 设置图标组件前缀为 'Icon' {prefix}-{collection}-{icon} 使用组件解析器时，必须遵循名称转换才能正确推断图标。
          IconsResolver({
            prefix: 'Icon',
            // 集合的别名
            alias: { park: 'icon-park' }
            // 自定义图标集合解析
            customCollections: ['local'],
            // 可选：启用特定图标集，默认启用 Iconify 支持的所有集合['mdi']
            enabledCollections: ['ep']
          }),
          NaiveUiResolver()
        ],
        // 自动导入组件目录
        // dirs: ['src/components'],
        dts: 'src/types/components.d.ts'
      })
    ]
  }
})
```

## 基本用法

```vue
<template>
  <!-- Material Design 的家图标 -->
  <IconMdiHome />
  <!-- Ionicons 的 Vue 图标 -->
  <IconIonLogoVue />
  <!-- Tabler 的 GitHub 图标 -->
  <IconTablerBrandGithub />
</template>
```

```vue
<script setup lang="ts">
// 无需导入图标，unplugin-icons 会自动处理
</script>

<template>
  <div class="icon-demo">
    <h2>图标演示</h2>

    <div class="icon-section">
      <h3>基本用法</h3>
      <div class="icon-grid">
        <!-- 使用 unplugin-icons 自动导入的图标 -->
        <!-- 格式: <Icon{CollectionName}{IconName} /> -->
        <div class="icon-item">
          <IconMdiHome />
          <span>Home</span>
        </div>
        <div class="icon-item">
          <IconEpPlus />
          <span>Plus</span>
        </div>
        <div class="icon-item">
          <IconLocalTypescript />
          <span>Typescript</span>
        </div>
        <div class="icon-item">
          <IconLocalLogo />
          <span>Logo</span>
        </div>
        <div class="icon-item">
          <IconMdiAccount />
          <span>Account</span>
        </div>
        <div class="icon-item">
          <IconMdiCog />
          <span>Settings</span>
        </div>
        <div class="icon-item">
          <IconMdiEmail />
          <span>Email</span>
        </div>
      </div>
    </div>

    <div class="icon-section">
      <h3>调整大小和颜色</h3>
      <div class="icon-grid">
        <div class="icon-item">
          <IconMdiHeart class="text-red-500" style="font-size: 24px" />
          <span>红色心形</span>
        </div>
        <div class="icon-item">
          <IconMdiStar class="text-yellow-500" style="font-size: 32px" />
          <span>黄色星星</span>
        </div>
        <div class="icon-item">
          <IconMdiThumbUp class="text-blue-500" style="font-size: 28px" />
          <span>蓝色点赞</span>
        </div>
      </div>
    </div>

    <div class="icon-section">
      <h3>其他图标集</h3>
      <div class="icon-grid">
        <!-- Ionicons 图标集 -->
        <div class="icon-item">
          <IconIonLogoVue />
          <span>Vue Logo</span>
        </div>
        <!-- Carbon 图标集 -->
        <div class="icon-item">
          <IconCarbonFaceAdd />
          <span>Face Add</span>
        </div>
        <!-- Tabler 图标集 -->
        <div class="icon-item">
          <IconTablerBrandGithub />
          <span>GitHub</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.icon-demo {
  width: 100%;
  height: 100%;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: bold;
}

h3 {
  margin: 16px 0;
  font-size: 18px;
  font-weight: bold;
}

.icon-section {
  margin-bottom: 30px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  background-color: #f5f5f5;
}

.icon-item span {
  margin-top: 8px;
  font-size: 12px;
}
</style>
```
