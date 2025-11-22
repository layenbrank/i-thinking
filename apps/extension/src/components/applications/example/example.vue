<script setup lang="tsx">
import Marker from '@/components/applications/example/example-marker.vue'
import Overlay from '@/components/applications/example/example-overlay.vue'
import { useSettings } from '@/hooks/application.ts'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'example'
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
				width: '60px',
				round: '12px',
				screenID: '0',
				height: '60px',
				name: '示例应用',
				shape: 'square',
				textSize: '13px',
				downloadCount: 1000,
				textColor: '#ffffff',
				component: 'example',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				description: '示例应用',
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
			}
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

const round = computed(function () {
	return props.application.round ?? 'var(--app-global-round)'
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
			'--app-round': round,
			'--app-background': background,
			'--app-size-width': style.width,
			'--app-grid-row': style.gridRow,
			'--app-size-height': style.height,
			'--app-grid-column': style.gridColumn
		}"
		:class="['example', application.size, application.shape, application.direction]"
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
			class="application-overlay example-overlay"
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
		<span class="app-name">{{ application.name }}</span>
		<close-outlined class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.example {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
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
