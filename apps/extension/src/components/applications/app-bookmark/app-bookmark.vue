<script setup lang="tsx">
import { useAppSettings } from '@/hooks/app-settings.ts'

import AppIcon from './app-bookmark-icon.vue'
import AppWindow from './app-bookmark-window.vue'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

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
				app: 'app-bookmark',
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

const mini = computed(() => props.application.size === 'mini')
const small = computed(() => props.application.size === 'small')
const medium = computed(() => props.application.size === 'medium')
const large = computed(() => props.application.size === 'large')
const huge = computed(() => props.application.size === 'huge')
const massive = computed(() => props.application.size === 'massive')
const ultra = computed(() => props.application.size === 'ultra')
const circle = computed(() => props.application.shape === 'circle')
const rectangle = computed(() => props.application.shape === 'rectangle')
const square = computed(() => props.application.shape === 'square')
const horizontal = computed(() => props.application.direction === 'horizontal')
const vertical = computed(() => props.application.direction === 'vertical')
const round = computed(() => props.application.round ?? 'var(--app-global-round)')
const background = computed(() => {
	if (props.application.backgroundImage) {
		return `url(${props.application.backgroundImage}) no-repeat center / cover`
	} else if (props.application.backgroundColor) return props.application.backgroundColor
	else return '#ffffff'
})

function transform(value: Application) {
	return {
		mini: value.size === 'mini',
		small: value.size === 'small',
		medium: value.size === 'medium',
		large: value.size === 'large',
		huge: value.size === 'huge',
		massive: value.size === 'massive',
		ultra: value.size === 'ultra',
		circle: value.shape === 'circle',
		rectangle: value.shape === 'rectangle',
		square: value.shape === 'square',
		horizontal: value.direction === 'horizontal',
		vertical: value.direction === 'vertical',
		round: value.round ?? 'var(--app-global-round)',
		background: value.backgroundImage
			? `url(${value.backgroundImage}) no-repeat center / cover`
			: value.backgroundColor
				? value.backgroundColor
				: '#ffffff'
	}
}

const { appStyle } = useAppSettings({
	width: computed(() => props.application.width ?? 'var(--app-global-width)'),
	height: computed(() => props.application.height ?? 'var(--app-global-height)'),
	mini,
	small,
	medium,
	large,
	huge,
	massive,
	ultra,
	circle,
	rectangle,
	square,
	horizontal,
	vertical
})

function updateVisible(value: boolean) {
	visible.value = value
}

function updateFullScreen(value: boolean) {
	fullscreen.value = value
}

function handleAppWindow() {
	visible.value = true
}
</script>

<template>
	<div
		:style="{
			'--app-round': round,
			'--app-size-width': appStyle.width,
			'--app-size-height': appStyle.height,
			'--app-grid-row': appStyle.gridRow,
			'--app-grid-column': appStyle.gridColumn,
			'--app-background': background
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
			@update:open="updateVisible"
			:style="{
				transformOrigin: 'center'
			}"
			:class="[
				'application-window',
				'bookmark-dialog',
				{
					fullscreen: fullscreen
				}
			]"
		>
			<app-window
				:fullscreen="fullscreen"
				@update:visible="updateVisible"
				@update:fullscreen="updateFullScreen"
			/>
		</a-modal>
		<app-icon
			:mini="mini"
			:small="small"
			:medium="medium"
			:large="large"
			:huge="huge"
			:massive="massive"
			:ultra="ultra"
			:circle="circle"
			:rectangle="rectangle"
			:square="square"
			:horizontal="horizontal"
			:vertical="vertical"
			:url="application.url"
			:icon="application.icon"
			:size="application.size"
			:shape="application.shape"
			:direction="application.direction"
			@click="handleAppWindow"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-bookmark {
	width: var(--app-size-width);
	height: var(--app-size-height);
	grid-row: var(--app-grid-row);
	grid-column: var(--app-grid-column);
	border-radius: var(--app-round);
}
</style>
<style lang="scss">
.application-window.bookmark-dialog {
	div[tabindex='0'][style='outline: none;'] {
		@apply w-full h-full;
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
		@apply w-full h-full;
	}

	.ant-modal-content {
		@apply bg-transparent;
	}

	.ant-modal-body {
		@apply bg-black bg-opacity-30 backdrop-blur-md rounded-lg;
	}
}
</style>
