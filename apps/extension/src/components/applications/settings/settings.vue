<script setup lang="tsx">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import Marker from '@/components/applications/settings/settings-marker.vue'
import Overlay from '@/components/applications/settings/settings-overlay.vue'
import { useStore } from '@/components/applications/settings/settings.ts'
import { useSettings } from '@/hooks/application'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'settings'
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
				name: '设置',
				size: 'mini',
				width: '60px',
				round: '12px',
				mirrorID: '0',
				height: '60px',
				shape: 'square',
				textSize: '13px',
				description: '设置',
				downloadCount: 1000,
				textColor: '#ffffff',
				component: 'settings',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
			}
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)
const { dispose } = useStore()

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

onUnmounted(function () {
	dispose()
})
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
		:class="['settings', application.size, application.shape, application.direction]"
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
			:destroy-on-close="false"
			@update:open="updateOverlay"
			:style="{
				transformOrigin: 'center',
				backgroundImage: `url(${backgroundImage})`,
				backgroundRepeat: 'no-repeat',
				backgroundSize: 'cover',
				backgroundAttachment: 'fixed',
				backgroundOrigin: 'content-box',
				backgroundClip: 'content-box',
				backgroundPosition: 'center'
			}"
			class="application-overlay settings-overlay"
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
.settings {
	width: var(--application-size-width);
	grid-row: var(--application-grid-row);
	height: var(--application-size-height);
	border-radius: var(--application-round);
	grid-column: var(--application-grid-column);
}
</style>
<style lang="scss">
.application-overlay.settings-overlay {
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
		// background-color: transparent;
		backdrop-filter: blur(21px);
		background-color: hsla(0, 0%, 100%, 0.5);
		// background-color: rgba($color: #000000, $alpha: 0.05);
	}

	.ant-modal-body {
		border-radius: var(--application-global-overlay-round);
		background-color: transparent;
		// background-color: rgba($color: #ffffff, $alpha: 1);
	}
}
</style>
