<script setup lang="tsx">
import { useDialog, useDialogReactiveList, type DialogReactive } from 'naive-ui'
import { useRefHistory, useMagicKeys, whenever, type UseRefHistoryRecord } from '@vueuse/core'

import { dateTimeService } from '@desktop-widgets/core'
import AppWindow from './bookmarks-window.vue'
import AppIcon from './bookmarks-icon.tsx'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'Bookmarks',
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
      margin: 0,
    },
    class: 'p-0 app-dialog bookmark-dialog',
    content: () => <AppWindow destroy={appWindowRef.value!.destroy} />,
  })
  console.log('appWindow', appWindowRef.value)
}
</script>

<template>
  <AppIcon @click="handleAppWindow" />
</template>

<style lang="scss" scoped>
// :global(.bookmark-window.n-dialog.n-modal) {
// }
</style>
