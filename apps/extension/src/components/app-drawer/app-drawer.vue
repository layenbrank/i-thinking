<script setup lang="ts">
import type { SlideApp } from '@/types/slide-app'
import type { DrawerProps } from 'ant-design-vue'

interface AppDrawerProps extends Omit<DrawerProps, 'visible'> {
  slideApp: SlideApp | null
}

defineOptions({
  name: 'app-drawer'
})

const props = withDefaults(defineProps<AppDrawerProps>(), {})
</script>

<template>
  <a-drawer v-bind="{ ...props }" :class="['app-drawer']">
    <pre>{{ slideApp }}</pre>
  </a-drawer>
</template>

<style lang="scss" scoped></style>
