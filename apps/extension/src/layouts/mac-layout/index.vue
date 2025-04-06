<script setup lang="ts">
import clsx from 'clsx'
import type { MacLayoutOptions } from '../index.ts'

defineOptions({
  name: 'MacLayout',
  inheritAttrs: false
})

withDefaults(defineProps<MacLayoutOptions>(), {})
</script>

<template>
  <a-layout v-bind="macLayout" :class="clsx('mac-layout', macLayout?.class)">
    <a-layout-header
      @contextmenu.prevent
      v-bind="macHeader"
      :class="clsx('mac-header', macHeader?.class)"
    >
      <slot name="header"></slot>
    </a-layout-header>
    <a-layout-content
      @contextmenu.prevent
      v-bind="macContent"
      :class="clsx('mac-content', macContent?.class)"
    >
      <slot name="content"></slot>
    </a-layout-content>
    <a-layout-footer
      @contextmenu.prevent
      v-bind="macFooter"
      :class="clsx('mac-footer', macFooter?.class)"
    >
      <slot name="footer"></slot>
    </a-layout-footer>
  </a-layout>
</template>

<style lang="scss" scoped>
.mac-layout {
  @apply w-full h-full;

  .mac-header {
    @apply h-9;
  }

  .mac-content {
    @apply h-[calc(100%-116px)];
  }

  .mac-footer {
    @apply h-20;
  }
}
</style>
