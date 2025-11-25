<script setup lang="tsx">
import Marker from '@/components/applications/markdown/markdown-marker.vue'
import Overlay from '@/components/applications/markdown/markdown-overlay.vue'
import { useSettings } from '@/hooks/application.ts'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'markdown'
})

const props = withDefaults(
	defineProps<{
		application?: Application
	}>(),
	{
		application() {
			return {
				id: '0',
				sort: 0,
				size: 'mini',
				name: '备忘录',
				width: '60px',
				round: '12px',
				mirrorID: '0',
				height: '60px',
				shape: 'square',
				textSize: '13px',
				downloadCount: 1000,
				description: '备忘录',
				textColor: '#ffffff',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				component: 'markdown',
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
			}
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

const style = computed(function () {
	return useSettings(props.application)
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
			'--application-background': background,
			'--application-size-width': style.width,
			'--application-grid-row': style.gridRow,
			'--application-size-height': style.height,
			'--application-grid-column': style.gridColumn
		}"
		:data-id="application.id"
		:class="['markdown', application.size, application.shape, application.direction]"
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
			class="application-overlay markdown-overlay"
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
		<span class="application-name">{{ application.name }}</span>
		<close-outlined class="application-trash-marker" />
	</div>
</template>

<style lang="scss" scoped>
.markdown {
	width: var(--application-size-width);
	height: var(--application-size-height);
	grid-row: var(--application-grid-row);
	grid-column: var(--application-grid-column);
	border-radius: var(--application-round);
}
</style>
<style lang="scss">
.application-overlay.markdown-overlay {
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
		overflow: hidden;
		background-color: rgba($color: #ffffff, $alpha: 1);
	}
}
</style>
