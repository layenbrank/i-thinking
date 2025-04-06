<script setup lang="ts">
import clsx from 'clsx'
import type { BaseLayoutOptions } from '../index.ts'
defineOptions({
  name: 'BaseLayout'
})

withDefaults(defineProps<BaseLayoutOptions>(), {})
</script>

<template>
  <n-layout
    v-bind="baseLayout"
    :style="baseLayout?.style"
    :class="['base-layout', clsx(baseLayout?.class)]"
  >
    <n-layout-sider
      v-bind="baseSider"
      :style="baseSider?.style"
      :class="['base-sider', clsx(baseSider?.class)]"
    >
      <slot name="sider"></slot>
    </n-layout-sider>

    <n-layout
      v-bind="baseMain"
      :style="baseMain?.style"
      :class="['base-main', clsx(baseMain?.class)]"
    >
      <n-layout-header
        v-bind="baseHeader"
        :style="baseHeader?.style"
        :class="['base-header', clsx(baseHeader?.class)]"
      >
        <slot name="header"></slot>
      </n-layout-header>
      <n-layout-content
        v-bind="baseContent"
        :style="baseContent?.style"
        :class="['base-content', clsx(baseContent?.class)]"
      >
        <slot name="content"></slot>
      </n-layout-content>
      <n-layout-footer
        v-bind="baseFooter"
        :style="baseFooter?.style"
        :class="['base-footer', clsx(baseFooter?.class)]"
      >
        <slot name="footer"></slot>
      </n-layout-footer>
    </n-layout>
  </n-layout>
</template>

<style lang="scss" scoped>
.base-layout {
  @apply w-full h-full;
}

.base-main {
  height: 100%;
}

.base-header {
  @apply h-16;
}

.base-content {
  @apply w-full;
  // margin-bottom: 64px;
}

.base-footer {
  @apply h-16;
}
</style>
