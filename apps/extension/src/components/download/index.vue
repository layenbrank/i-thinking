<script setup lang="tsx">
import { useDialog, type DialogReactive } from 'naive-ui'

import AppIcon from './download-icon.tsx'
import AppWindow from './download-window.tsx'

defineOptions({
  name: 'Download'
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
    class: 'p-0 app-dialog download-dialog',
    content() {
      return <AppWindow destroy={appWindowRef.value!.destroy} />
    }
  })
}
</script>

<template>
  <div>
    <AppIcon
      @click="handleAppWindow"
      :app="{
        name: 'download',
        icon: ''
      }"
    />
  </div>
</template>

<style lang="scss" scoped></style>
