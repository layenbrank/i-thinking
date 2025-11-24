<script setup lang="ts">
import Marker from '@/components/applications/collection/collection-marker.vue'
import Overlay from '@/components/applications/collection/collection-overlay.vue'
import { useSettings } from '@/hooks/application.ts'
import { Modal } from 'ant-design-vue'
import CloseOutlined from '~icons/local/close'

defineOptions({
	name: 'collection'
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
				mirrorID: '0',
				height: '60px',
				name: '集合应用',
				shape: 'square',
				textSize: '13px',
				downloadCount: 1000,
				textColor: '#ffffff',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				description: '集合应用',
				component: 'collection',
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
			}
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

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
		class="collection"
		:class="[application.size, application.shape, application.direction]"
	>
		<Modal
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
			class="application-overlay collection-overlay"
		>
			<Overlay
				:fullscreen="fullscreen"
				@update:visible="updateOverlay"
				@update:fullscreen="updateFullScreen"
			/>
		</Modal>
		<Marker
			:id="application.id"
			@dblclick="updateOverlay(true)"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="app-name">{{ application.name }}</span>
		<CloseOutlined class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.collection {
	width: var(--application-size-width);
	grid-row: var(--application-grid-row);
	height: var(--application-size-height);
	border-radius: var(--application-round);
	grid-column: var(--application-grid-column);
}
</style>
<style lang="scss">
.application-overlay.collection-overlay {
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
