<script setup lang="tsx">
import Marker from '@/components/applications/example/example-marker.vue'
import Overlay from '@/components/applications/example/example-overlay.vue'
import { Modal } from 'ant-design-vue'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
	name: 'example'
})

const props = withDefaults(
	defineProps<{
		size: Mirror.Size
		shape: Mirror.Shape
		application: Application
		direction: Mirror.Direction
	}>(),
	{
		application() {
			const DEFAULT: Application = {
				id: '0',
				url: null,
				mark: null,
				collectionID: null,
				index: 0,
				round: '12px',
				title: '示例应用',
				mirrorID: '0',
				textSize: '13px',
				textColor: '#ffffff',
				component: 'example',
				updatedAt: Date.now(),
				createdAt: Date.now(),
				description: '示例应用',
				downloadCount: 1000,
				background: null,
				backdrop: null
			}
			return DEFAULT
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

const { style } = useApplication(props.application)

function updateOverlay(value: boolean) {
	visible.value = value
}

function updateFullScreen(value: boolean) {
	fullscreen.value = value
}
</script>

<template>
	<div :style="style" class="example">
		<Modal
			width="80%"
			:icon="null"
			:title="null"
			:footer="null"
			:open="visible"
			:centered="true"
			:closable="false"
			:mask-closable="true"
			:destroy-on-close="true"
			@update:open="updateOverlay"
			:style="{
				transformOrigin: 'center'
			}"
			class="application-overlay example-overlay"
		>
			<Overlay
				:fullscreen="fullscreen"
				@update:visible="updateOverlay"
				@update:fullscreen="updateFullScreen"
			/>
		</Modal>
		<Marker @dblclick="updateOverlay(true)" :class="[size, shape, direction]" />
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-mark" />
	</div>
</template>

<style lang="scss" scoped>
.example {
	@extend %application;
}
</style>
<style lang="scss">
.application-overlay.example-overlay {
	%size-full {
		width: 100%;
		height: 100%;
	}

	div[tabindex='0'][style='outline: none;'] {
		@extend %size-full;
	}

	.ant-modal-content,
	.ant-modal-body,
	.ant-modal-confirm-body-wrapper,
	.ant-modal-confirm-body,
	.ant-modal-confirm-content {
		@extend %size-full;
	}

	.ant-modal-content {
		background-color: transparent;
	}

	.ant-modal-body {
		border-radius: 8px;
		background-color: rgba($color: #ffffff, $alpha: 1);
	}
}
</style>
