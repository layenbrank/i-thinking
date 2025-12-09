<script setup lang="tsx">
import Marker from '@/components/applications/bookmark/bookmark-marker.vue'
import Overlay from '@/components/applications/bookmark/bookmark-overlay.vue'
import DestroyMark from '~icons/local/close'
import { useApplication } from '@/hooks/application.ts'
// type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
	name: 'bookmark'
})

const props = withDefaults(
	defineProps<{
		size: Mirror.Size
		shape: Mirror.Shape
		application: Application
		direction: Mirror.Direction
	}>(),
	{
		application() {
			const DEFAULT: Application = {
				id: '0',
				url: null,
				mark: null,
				collectionID: null,
				index: 0,
				title: '书签',
				round: '12px',
				mirrorID: '0',
				textSize: '13px',
				description: '书签',
				downloadCount: 1000,
				textColor: '#ffffff',
				backdrop: null,
				background: null,
				updatedAt: Date.now(),
				createdAt: Date.now(),
				component: 'bookmark'
			}
			return DEFAULT
		}
	}
)

const visible = ref(false)
const fullscreen = ref(false)

const { style } = useApplication(props.application)

function updateOverlay(value: boolean) {
	visible.value = value
}

function updateFullScreen(value: boolean) {
	fullscreen.value = value
}
</script>

<template>
	<div :style="style" class="bookmark">
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
		<Marker @dblclick="updateOverlay(true)" :class="[size, shape, direction]" />
		<span class="application-title">{{ application.title }}</span>
		<destroy-mark class="application-trash-mark" />
	</div>
</template>

<style lang="scss" scoped>
.bookmark {
	@extend %application;
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
