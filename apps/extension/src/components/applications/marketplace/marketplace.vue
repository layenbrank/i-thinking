<script setup lang="tsx">
import Marker from '@/components/applications/marketplace/marketplace-marker.vue'
import Overlay from '@/components/applications/marketplace/marketplace-overlay.vue'
import DestroyMark from '~icons/local/close'

defineOptions({
	name: 'marketplace'
})

const props = withDefaults(
	defineProps<{
		application?: Application
	}>(),
	{
		application() {
			const DEFAULT: Application = {
				id: '0',
				index: 0,
				title: '商店',
				size: 'mini',
				round: '12px',
				mirrorID: '0',
				shape: 'square',
				textSize: '13px',
				description: '商店',
				downloadCount: 1000,
				textColor: '#ffffff',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				direction: 'horizontal',
				component: 'marketplace',
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
		:class="['marketplace', application.size, application.shape, application.direction]"
	>
		<a-modal
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
			class="application-overlay store-overlay"
		>
			<Overlay
				:fullscreen="fullscreen"
				@update:visible="updateOverlay"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>
		<Marker
			@dblclick="updateOverlay(true)"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-mark" />
	</div>
</template>

<style lang="scss" scoped>
.marketplace {
	@extend %application;
}
</style>
<style lang="scss">
.application-overlay.store-overlay {
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
		background-color: rgba($color: #ffffff, $alpha: 0.8);
	}
}
</style>
