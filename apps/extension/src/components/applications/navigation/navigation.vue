<script setup lang="tsx">
import Marker from '@/components/applications/navigation/navigation-marker.vue'
import { useSettings } from '@/hooks/application.ts'
import { message } from 'ant-design-vue'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'navigation'
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
				name: '导航',
				size: 'mini',
				width: '60px',
				round: '12px',
				screenID: '0',
				height: '60px',
				shape: 'square',
				textSize: '13px',
				description: '导航',
				downloadCount: 1000,
				textColor: '#ffffff',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				component: 'navigation',
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
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
			:icon="application.marker"
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
