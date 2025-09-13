<script setup lang="tsx">
import { useSettings } from '@/hooks/application-settings.ts'
import ApplicationIcon from './app-clipchamp-icon.vue'
import ApplicationWindow from './app-clipchamp-window.vue'

defineOptions({
	name: 'app-clipchamp'
})

const props = withDefaults(
	defineProps<{
		application?: Application
		settingsVisible?: boolean
	}>(),
	{
		application() {
			return {
				id: '0',
				width: '60px',
				height: '60px',
				component: 'app-clipchamp',
				round: '12px',
				size: 'medium',
				slideID: '0',
				sort: 0,
				name: '记事本',
				direction: 'horizontal',
				shape: 'square',
				backgroundColor: '#ffffff4d',
				backgroundImage: null,
				textSize: '13px',
				textColor: '#ffffff',
				description: '记事本',
				downloadCount: 1000
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

const componentStyle = computed(function () {
	return useSettings(props.application)
})

function handleAppWindow(value: boolean) {
	if (props.settingsVisible) return
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
			'--app-size-width': componentStyle.width,
			'--app-grid-row': componentStyle.gridRow,
			'--app-size-height': componentStyle.height,
			'--app-grid-column': componentStyle.gridColumn
		}"
		:data-id="application.id"
		:class="['app-clipchamp', application.size, application.shape, application.direction]"
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
			@update:open="handleAppWindow"
			:style="{
				transformOrigin: 'center'
			}"
			class="application-window clipchamp-window"
		>
			<application-window
				:fullscreen="fullscreen"
				@update:visible="handleAppWindow"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>
		<application-icon
			@dblclick="handleAppWindow(true)"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<IconLocalClose class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-clipchamp {
	width: var(--app-size-width);
	height: var(--app-size-height);
	grid-row: var(--app-grid-row);
	grid-column: var(--app-grid-column);
	border-radius: var(--app-round);
}
</style>
<style lang="scss">
.app-dialog.clipchamp-window {
	div[tabindex='0'][style='outline: none;'] {
		@apply w-full h-full;
	}

	.ant-modal-content,
	.ant-modal-body,
	.ant-modal-confirm-body-wrapper,
	.ant-modal-confirm-body,
	.ant-modal-confirm-content {
		@apply w-full h-full;
	}

	.ant-modal-content {
		@apply bg-transparent;
	}

	.ant-modal-body {
		@apply bg-white rounded-lg;
	}
}
</style>
