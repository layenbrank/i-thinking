<script setup lang="tsx">
import { useDialog, type DialogReactive } from 'naive-ui'
import AppIcon from './app-store-icon.vue'
import AppWindow from './app-store-window.vue'

defineOptions({
  name: 'AppStore'
})

const dialog = useDialog()
const appWindowRef = ref<DialogReactive | null>(null)
function handleAppWindow() {
  appWindowRef.value = dialog.create({
    showIcon: false,
    title: undefined,
    blockScroll: true,
    closeOnEsc: true,
    closable: false,
    transformOrigin: 'center',
    contentClass: 'h-full',
    contentStyle: {
      margin: 0
    },
    class: 'p-0 app-dialog application-dialog',
    content() {
      return <AppWindow class={[]} />
    }
  })
}
</script>

<template>
  <AppIcon @click="handleAppWindow" />
</template>

<style lang="scss" scoped></style>
