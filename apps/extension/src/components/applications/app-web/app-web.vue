<script setup lang="tsx">
import { useSettings } from '@/hooks/application-settings.ts'
import { message } from 'ant-design-vue'
import ApplicationIcon from './app-web-icon.vue'

defineOptions({
	name: 'app-web'
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
				app: 'app-web',
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

function handleJumpLink() {
	if (props.settingsVisible) return
	if (!props.application.url) return message.error('请先设置链接地址!')

	window.open(props.application.url, '_blank')
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
		:class="['app-web', application.size, application.shape, application.direction]"
	>
		<application-icon
			:icon="application.icon"
			@dblclick="handleJumpLink"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-web {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
}
</style>
