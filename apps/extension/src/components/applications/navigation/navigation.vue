<script setup lang="tsx">
import Marker from '@/components/applications/navigation/navigation-marker.vue'
import { useSettings } from '@/hooks/application-settings.ts'
import { message } from 'ant-design-vue'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'navigation'
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
				component: 'navigation',
				round: '12px',
				size: 'medium',
				screenID: '0',
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

const style = computed(function () {
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
			'--app-size-width': style.width,
			'--app-grid-row': style.gridRow,
			'--app-size-height': style.height,
			'--app-grid-column': style.gridColumn
		}"
		:class="['navigation', application.size, application.shape, application.direction]"
	>
		<Marker
			:icon="application.icon"
			@dblclick="handleJumpLink"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<close-outlined class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.navigation {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
}
</style>
