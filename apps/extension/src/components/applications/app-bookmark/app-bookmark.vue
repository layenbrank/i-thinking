<script setup lang="tsx">
import { useSettings } from '@/hooks/application-settings.ts'
import ApplicationIcon from './app-bookmark-icon.vue'
import ApplicationWindow from './app-bookmark-window.vue'

// type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

defineOptions({
	name: 'app-bookmark'
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
				component: 'bookmark',
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
	visible.value = value
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
		:class="['app-bookmark', application.size, application.shape, application.direction]"
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
			:class="[
				'application-window',
				'bookmark-window',
				{
					fullscreen: fullscreen
				}
			]"
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
.app-bookmark {
	width: var(--app-size-width);
	grid-row: var(--app-grid-row);
	height: var(--app-size-height);
	border-radius: var(--app-round);
	grid-column: var(--app-grid-column);
}
</style>
<style lang="scss">
.application-window.bookmark-window {
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
