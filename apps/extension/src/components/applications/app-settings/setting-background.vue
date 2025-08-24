<script setup lang="ts">
import type { CSSProperties } from 'vue'

defineOptions({
	name: 'setting-background'
})

const formState = reactive<CSSProperties>({
	backgroundImage: '',
	backgroundColor: ''
})

function onFinish(values: any) {
	console.log('Success:', values)
}

function onFinishFailed(errorInfo: any) {
	console.log('Failed:', errorInfo)
}
</script>

<template>
	<div class="setting-background">
		<a-form
			:model="formState"
			name="validate_other"
			layout="vertical"
			@finishFailed="onFinishFailed"
			@finish="onFinish"
			class="app-drawer-form"
		>
			<a-form-item name="background" label="背景" class="app-background-form-item">
				<!-- <a-color-picker v-model:value="formState.background" /> -->
			</a-form-item>
		</a-form>
	</div>
</template>

<style lang="scss" scoped></style>
