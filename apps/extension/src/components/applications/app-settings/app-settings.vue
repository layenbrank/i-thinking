<script setup lang="tsx">
import { useSettings } from '@/hooks/application-settings.ts'
import type { CSSProperties } from 'vue'
import ApplicationIcon from './app-settings-icon.vue'
import ApplicationWindow from './app-settings-window.vue'

defineOptions({
	name: 'app-settings'
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
				app: 'app-settings',
				round: '12px',
				size: 'medium',
				slideID: '0',
				sort: 0,
				name: 'example',
				direction: 'horizontal',
				shape: 'square',
				backgroundColor: '#ffffff4d',
				backgroundImage: null,
				textSize: '13px',
				textColor: '#ffffff',
				description: '书签',
				downloadCount: 1000
			}
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)
const windowStyle = ref<CSSProperties>({
	width: '80%',
	transformOrigin: 'center',
	transform: 'translate(0px,0px)'
})

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

function updateTransform(value: string) {
	windowStyle.value.transform = value
}

function updateResize(value: { width: number; height: number }) {
	windowStyle.value.width = `${(value.width / innerWidth) * 100}%`
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
		:class="['app-settings', application.size, application.shape, application.direction]"
	>
		<a-modal
			:icon="null"
			:title="null"
			:footer="null"
			:open="visible"
			:centered="true"
			:closable="false"
			:style="windowStyle"
			:mask-closable="false"
			:mask="false"
			:destroy-on-close="true"
			@update:open="handleAppWindow"
			class="application-window settings-window"
		>
			<application-window
				:fullscreen="fullscreen"
				@update:transform="updateTransform"
				@update:resize="updateResize"
				@update:visible="handleAppWindow"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>
		<application-icon
			@dblclick="handleAppWindow(true)"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-settings {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
}
</style>
<style lang="scss">
.ant-modal-root {
	.ant-modal-wrap {
		&:has(.settings-window) {
			pointer-events: none;
		}
	}
}
.application-window.settings-window {
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
