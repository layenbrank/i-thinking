<script setup lang="tsx">
import Marker from '@/components/applications/navigation/navigation-marker.vue'
import { message } from 'ant-design-vue'
import DestroyMark from '~icons/local/close'

defineOptions({
	name: 'navigation'
})

const props = withDefaults(
	defineProps<{
		application?: Application
	}>(),
	{
		application() {
			const DEFAULT: Application = {
				id: '0',
				index: 0,
				title: '导航',
				size: 'mini',
				round: '12px',
				mirrorID: '0',
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
			return DEFAULT
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

function handleJumpLink() {
	if (!props.application.url) return message.error('请先设置链接地址!')

	window.open(props.application.url, '_blank')
}
</script>

<template>
	<div
		:style="{
			'--application-round': round,
			'--application-background': background
		}"
		:class="['navigation', application.size, application.shape, application.direction]"
	>
		<Marker
			:marker="application.marker"
			:title="application.title"
			:id="application.id"
			@dblclick="handleJumpLink"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-mark" />
	</div>
</template>

<style lang="scss" scoped>
.navigation {
	@extend %application;
}
</style>
