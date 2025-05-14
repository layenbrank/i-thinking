<script setup lang="tsx">
import { open as showOpenDialog } from '@tauri-apps/plugin-dialog'
import {
  exists,
  BaseDirectory,
  open,
  readDir,
  watch as watchDir,
  watchImmediate,
  type UnwatchFn
} from '@tauri-apps/plugin-fs'
import { desktopDir, resolve, dirname, join } from '@tauri-apps/api/path'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'

import { Button, Input, message } from 'ant-design-vue'
import { v4 as uuidv4 } from 'uuid'

import ReForm, { type FormOptions } from '@/components/re-form.vue'

import { useDirs } from '@/hooks/files.ts'

defineOptions({
  name: 'monitor-changes'
})

const formRef = useTemplateRef('formRef')

const formOptions = reactive<FormOptions[]>([])

async function handleSelectFolder(key: string) {
  const dirPath = await showOpenDialog({
    directory: true
  })

  for (const option of formOptions) {
    if (option.key !== key) continue
    option.value = dirPath ?? ''

    if (!dirPath) return

    option.unwatch?.()

    option.unwatch = await watchDir(
      dirPath,
      function (event) {
        console.log('event', event)
        console.log('valueOf', event.type.valueOf().toString())

        sendNotification({
          title: '文件变化',
          body: `${event.paths} 发生了 ${Object.getOwnPropertyNames(event.type)} 事件`
        })
      },
      {
        recursive: true,
        delayMs: 3000
      }
    )
  }
}

function handleIncrement() {
  const form = {
    label: `路径-${formOptions.length + 1}`,
    key: `path-${formOptions.length + 1}`,
    value: '',
    unwatch: null,
    content() {
      return (
        <>
          <Input
            value={this.value}
            onUpdate:value={(value: string) => {
              this.value = value
              console.log('value', this.value)
            }}
          ></Input>
          {this.value && <Button onClick={() => handleSelectFolder(this.key)}>选择目录</Button>}
          {!this.value && (
            <Button danger onClick={() => handleSelectFolder(this.key)}>
              删除
            </Button>
          )}
        </>
      )
    }
  }

  formOptions.push(form)
}

function handleDecrement() {
  formOptions.pop()
}

onMounted(function () {
  handleIncrement()
})

onUnmounted(function () {
  for (const option of formOptions) option.unwatch?.()
})
</script>

<template>
  <div class="monitor-changes">
    <ReForm
      ref="formRef"
      :model="formOptions"
      name="dynamic-rule"
      :labelCol="{ span: 4 }"
      :wrapperCol="{ span: 12 }"
      :options="formOptions"
      class="monitor-changes-form"
    />

    <a-button @click="handleIncrement">递增</a-button>
  </div>
</template>

<style lang="scss" scoped>
.monitor-changes {
  &-form {
  }

  :deep(.ant-form-item) {
    &[class*='path-'] {
      .ant-row {
      }

      .ant-col {
      }

      .ant-form-item-control-input {
        &-content {
          @apply flex flex-row gap-x-2;
        }
      }
    }
  }
}
</style>
