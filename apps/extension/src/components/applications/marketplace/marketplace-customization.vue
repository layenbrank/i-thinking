<script setup lang="ts">
import { InboxOutlined, UploadOutlined } from '@ant-design/icons-vue'

defineOptions({
	name: 'marketplace-customization'
})

const formItemLayout = {
	labelCol: { span: 6 },
	wrapperCol: { span: 14 }
}

const formState = reactive({
	rate: 3.5,
	URL: '',
	title: '',
	upload: [],
	dragger: []
})
function onFinish(values: any) {
	console.log('Success:', values)
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
			@finish="onFinish"
		>
			<a-form-item
				name="title"
				label="Title"
				has-feedback
				validate-status="error"
				:rules="[
					{
						required: true,
						message: 'Please select your country!'
					}
				]"
			>
				<a-input v-model:value="formState.title" id="error" placeholder="unavailable choice" />
			</a-form-item>
			<a-form-item
				name="URL"
				label="URL"
				has-feedback
				validate-status="error"
				:rules="[
					{
						required: true,
						message: 'Please select your country!'
					}
				]"
			>
				<a-input v-model:value="formState.URL" id="error" placeholder="unavailable choice" />
			</a-form-item>

			<a-form-item name="upload" label="Upload" extra="longgggggggggggggggggggggggggggggggggg">
				<a-upload
					v-model:fileList="formState.upload"
					name="logo"
					accept="image/*"
					:multiple="false"
					:maxCount="1"
					action="/upload.do"
					list-type="picture"
				>
					<a-button>
						<template #icon>
							<UploadOutlined />
						</template>
						Click to upload
					</a-button>
				</a-upload>
			</a-form-item>

			<a-form-item label="Dragger">
				<a-form-item name="dragger" no-style>
					<a-upload-dragger
						name="files"
						:maxCount="1"
						accept="image/*"
						:multiple="false"
						listType="picture"
						action="/upload.do"
						v-model:fileList="formState.dragger"
					>
						<p class="ant-upload-drag-icon">
							<InboxOutlined />
						</p>
						<p class="ant-upload-text">Click or drag file to this area to upload</p>
						<p class="ant-upload-hint">Support for a single or bulk upload.</p>
					</a-upload-dragger>
				</a-form-item>
			</a-form-item>

			<a-form-item :wrapper-col="{ span: 12, offset: 6 }">
				<a-button type="primary" html-type="submit">提交</a-button>
			</a-form-item>
		</a-form>
	</div>
</template>

<style lang="scss" scoped>
.marketplace-customization {
	// background-color: #4080ff;
}
</style>
