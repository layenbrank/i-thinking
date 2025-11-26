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
				index: 0,
				name: '导航',
				size: 'mini',
				width: '60px',
				round: '12px',
				mirrorID: '0',
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

function handleJumpLink() {
	if (!props.application.url) return message.error('请先设置链接地址!')

	window.open(props.application.url, '_blank')
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
		:class="['navigation', application.size, application.shape, application.direction]"
	>
		<Marker
			:marker="application.marker"
			:name="application.name"
			:id="application.id"
			@dblclick="handleJumpLink"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="application-name">{{ application.name }}</span>
		<CloseOutlined class="application-trash-marker" />
	</div>
</template>

<style lang="scss" scoped>
.navigation {
	width: var(--application-size-width);
	grid-row: var(--application-grid-row);
	height: var(--application-size-height);
	border-radius: var(--application-round);
	grid-column: var(--application-grid-column);
}
</style>
