<script setup lang="tsx">
import Marker from '@/components/applications/bookmark/bookmark-marker.vue'
import Overlay from '@/components/applications/bookmark/bookmark-overlay.vue'
import { useSettings } from '@/hooks/mirror.ts'
import DestroyMark from '~icons/local/close'
// type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
	name: 'bookmark'
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
				title: '书签',
				size: 'mini',
				round: '12px',
				mirrorID: '0',
				shape: 'square',
				textSize: '13px',
				description: '书签',
				downloadCount: 1000,
				textColor: '#ffffff',
				backgroundImage: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				component: 'bookmark',
				direction: 'horizontal',
				backgroundColor: '#ffffff4d'
			}

			return DEFAULT
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
		:class="['bookmark', application.size, application.shape, application.direction]"
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
			@update:open="updateOverlay"
			:style="{
				transformOrigin: 'center'
			}"
			:class="[
				'application-overlay bookmark-overlay',
				{
					fullscreen: fullscreen
				}
			]"
		>
			<Overlay
				:fullscreen="fullscreen"
				@update:visible="updateOverlay"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>
		<Marker
			:size="application.size"
			:shape="application.shape"
			@dblclick="updateOverlay(true)"
			:direction="application.direction"
			:class="[application.size, application.shape, application.direction]"
		/>
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-marker" />
	</div>
</template>

<style lang="scss" scoped>
.bookmark {
	@extend %application;
	// $size-x: 150px;
	// $size-y: 150px;

	// // width: $size-x;
	// // aspect-ratio: 9/16;

	// height: $size-y;
	// aspect-ratio: 16/9;

	// border-radius: var(--application-round);

	// width: var(--application-size-width);
	// grid-row: var(--application-grid-row);
	// height: var(--application-size-height);
	// grid-column: var(--application-grid-column);
}
</style>
<style lang="scss">
.application-overlay.bookmark-overlay {
	%size-full {
		width: 100%;
		height: 100%;
	}

	div[tabindex='0'][style='outline: none;'] {
		@extend %size-full;
	}

	&:not(.fullscreen) {
	}

	&.fullscreen {
		height: 100%;
		max-width: 100%;
		min-width: 100%;
		border-radius: 0px;
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
		backdrop-filter: blur(12px);
		// background-color: rgba($color: #000000, $alpha: 0.3);
	}
}
</style>
