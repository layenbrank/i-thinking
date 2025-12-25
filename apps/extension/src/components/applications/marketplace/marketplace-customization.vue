<script setup lang="ts">
import { useMirrorStore } from '@/stores/mirror.ts'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({
  name: 'marketplace-customization'
})

const store = useMirrorStore()

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

const formState = reactive({
  URL: '',
  name: '',
  upload: [],
  dragger: []
})
function onFinish(values: any) {
  if (!store.mirrorID) return message.error('未选择镜像，无法添加应用')

  try {
    void store
      .toInsertApplication([
        {
          title: values.name,
          url: values.URL,
          // TODO: 待定 ID 来源
          id: crypto.randomUUID(),
          index: store.applications?.length ?? 0,
          component: 'navigation',
          // TODO: 待定 marker 来源
          mark: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          round: '8px',
          mirrorID: store.mirrorID,
          collectionID: '0',
          textColor: '#fff',
          textSize: '16px',
          description: '',
          downloadCount: 0,
          background: null,
          backdrop: null
        }
      ])
      .then(function () {
        message.success('添加成功！')
      })
  } catch {
    message.error('添加失败，请重试！')
  }
}

function onFinishFailed(errorInfo: any) {
  console.log('Failed:', errorInfo)
}
</script>

<template>
  <div class="marketplace-customization">
    <a-form
      :model="formState"
      name="validate_other"
      v-bind="formItemLayout"
      @finishFailed="onFinishFailed"
      @finish="onFinish">
      <a-form-item
        name="name"
        label="名称"
        has-feedback
        validate-status="error"
        :rules="[
          {
            required: true,
            message: '请先设置名称!'
          }
        ]">
        <a-input
          v-model:value="formState.name"
          id="error"
          placeholder="不可用的选择" />
      </a-form-item>
      <a-form-item
        name="URL"
        label="链接地址"
        has-feedback
        validate-status="error"
        :rules="[
          {
            required: true,
            message: '请先设置链接地址!'
          }
        ]">
        <a-input
          v-model:value="formState.URL"
          id="error"
          placeholder="unavailable choice" />
      </a-form-item>

      <a-form-item
        name="upload"
        label="上传"
        extra="longgggggggggggggggggggggggggggggggggg">
        <a-upload
          v-model:fileList="formState.upload"
          name="logo"
          accept="image/*"
          :multiple="false"
          :maxCount="1"
          action="/upload.do"
          list-type="picture">
          <a-button>
            <template #icon>
              <UploadOutlined />
            </template>
            点击上传
          </a-button>
        </a-upload>
      </a-form-item>

      <a-form-item label="拖拽上传">
        <a-form-item
          name="dragger"
          no-style>
          <a-upload-dragger
            name="files"
            :maxCount="1"
            accept="image/*"
            :multiple="false"
            listType="picture"
            action="/upload.do"
            v-model:fileList="formState.dragger">
            <p class="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p class="ant-upload-hint">仅支持单个文件上传。</p>
          </a-upload-dragger>
        </a-form-item>
      </a-form-item>

      <a-form-item :wrapper-col="{ span: 12, offset: 6 }">
        <a-button
          type="primary"
          html-type="submit"
          >提交</a-button
        >
      </a-form-item>
    </a-form>
  </div>
</template>

<style lang="scss" scoped>
.marketplace-customization {
  // background-color: #4080ff;
}
</style>
