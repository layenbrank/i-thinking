<script setup lang="tsx">
import { useSettings } from '@/hooks/application-settings.ts'
import { message } from 'ant-design-vue'
import ApplicationIcon from './app-calendar-icon.vue'
import ApplicationWindow from './app-calendar-window.vue'

defineOptions({
	name: 'app-calendar'
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
				sort: 0,
				name: '示例',
				slideID: '0',
				round: '12px',
				width: '60px',
				height: '60px',
				size: 'medium',
				shape: 'square',
				textSize: '13px',
				description: '书签',
				app: 'app-calendar',
				downloadCount: 1000,
				textColor: '#ffffff',
				backgroundImage: null,
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

const componentStyle = computed(function () {
	return useSettings(props.application)
})

function handleAppWindow(value: boolean) {
	if (props.settingsVisible) return
	visible.value = value
	message.success('打开日历应用')
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
		:class="['app-calendar', application.size, application.shape, application.direction]"
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
			class="application-window calendar-window"
		>
			<application-window
				:fullscreen="fullscreen"
				@update:visible="handleAppWindow"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>

		<application-icon
			:size="application.size"
			:shape="application.shape"
			@dblclick="handleAppWindow(true)"
			:direction="application.direction"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-calendar {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
}
</style>
<style lang="scss">
.application-window.calendar-window {
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
		background-color: #ffffff;
		border-radius: 8px;
	}
}
</style>
