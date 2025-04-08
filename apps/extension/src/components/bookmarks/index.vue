<script setup lang="tsx">
import { Modal } from 'ant-design-vue'
import { useRefHistory, useMagicKeys, whenever, type UseRefHistoryRecord } from '@vueuse/core'

import { dateTimeService } from '@desktop-widgets/core'
import AppWindow from './bookmarks-window.vue'
import AppIcon from './bookmarks-icon.tsx'
import clsx from 'clsx'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
  name: 'Bookmarks'
})

const appWindowRef = ref<AppWindowType>()

function handleAppWindow() {
  appWindowRef.value = Modal.info({
    icon: null,
    title: null,
    footer: null,
    centered: true,
    width: '80%',
    maskClosable: true,
    class: clsx('app-dialog', 'bookmark-window'),
    content() {
      return <AppWindow appWindowRef={appWindowRef.value} class={[]} />
    }
  })
}
</script>

<template>
  <div class="app-bookmark">
    <AppIcon @click="handleAppWindow" />
    <span class="app-title">example</span>
    <IconLocalClose class="app-trash-icon hidden" />
  </div>
</template>

<style lang="scss" scoped>
.app-bookmark {
}
</style>
<style lang="scss">
.app-dialog.bookmark-window {
  div[tabindex='0'][style='outline: none;'] {
    @apply w-full h-full;
  }

  .ant-modal-content,
  .ant-modal-body,
  .ant-modal-confirm-body-wrapper,
  .ant-modal-confirm-body,
  .ant-modal-confirm-content {
    @apply w-full h-full;
  }

  .ant-modal-content {
    @apply bg-transparent;
  }

  .ant-modal-body {
    @apply bg-black bg-opacity-30 backdrop-blur-md rounded-lg;
  }
}
</style>
