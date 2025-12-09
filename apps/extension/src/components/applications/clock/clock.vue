<script setup lang="tsx">
import Marker from '@/components/applications/clock/clock-marker.vue'
import Overlay from '@/components/applications/clock/clock-overlay.vue'
import { Modal } from 'ant-design-vue'
import DestroyMark from '~icons/local/close'

defineOptions({
	name: 'clock'
})

const props = withDefaults(
	defineProps<{
		application?: Application
	}>(),
	{
		application() {
			const DEFAULT: Application = {
				id: '0',
				size: 'mini',
				index: 0,
				round: '12px',
				title: '示例应用',
				shape: 'square',
				mirrorID: '0',
				textSize: '13px',
				textColor: '#ffffff',
				component: 'clock',
				updatedAt: Date.now(),
				createdAt: Date.now(),
				direction: 'horizontal',
				description: '示例应用',
				downloadCount: 1000,
				backgroundImage: null,
				backgroundColor: '#ffffff4d'
			}
			return DEFAULT
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

const round = computed(function () {
	return props.application.round ?? 'var(--application-global-round)'
})

const background = computed(function () {
	const backgroundImage = `url(${props.application.backgroundImage}) no-repeat center / cover`
	if (props.application.backgroundImage) return backgroundImage
	if (props.application.backgroundColor) return props.application.backgroundColor
	return '#ffffff'
})

function updateOverlay(value: boolean) {
	visible.value = value
}

function updateFullScreen(value: boolean) {
	fullscreen.value = value
}
</script>

<template>
	<div
		:style="{
			'--application-round': round,
			'--application-background': background
		}"
		:class="['clock', application.size, application.shape, application.direction]"
	>
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
			class="application-overlay clock-overlay"
		>
			<Overlay
				:fullscreen="fullscreen"
				@update:visible="updateOverlay"
				@update:fullscreen="updateFullScreen"
			/>
		</Modal>
		<Marker
			@dblclick="updateOverlay(true)"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-mark" />
	</div>
</template>

<style lang="scss" scoped>
.clock {
	@extend %application;
}
</style>
<style lang="scss">
.application-overlay.clock-overlay {
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
