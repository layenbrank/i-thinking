<script setup lang="tsx">
import clsx from 'clsx'
import { Modal } from 'ant-design-vue'
import AppIcon from './app-example-icon.vue'
import AppWindow from './app-example-window.vue'

defineOptions({
  name: 'app-test'
})

// const props = withDefaults(defineProps<{}>(), {})

const appWindowRef = ref<AppWindowType>()

function handleAppWindow() {
  appWindowRef.value = Modal.info({
    icon: null,
    title: null,
    footer: null,
    centered: true,
    width: '1000px',
    maskClosable: true,
    class: clsx('app-dialog example-window'),
    content() {
      return <AppWindow appWindowRef={appWindowRef.value} class={[]} />
    }
  })
}
</script>

<template>
  <div class="app-example">
    <AppIcon app-size="small" @click="handleAppWindow" />
    <span class="app-title">example</span>
    <IconLocalClose class="app-trash-icon" />
  </div>
</template>

<style lang="scss" scoped>
.app-example {
}
</style>
<style lang="scss">
.app-dialog.example-window {
}
</style>
