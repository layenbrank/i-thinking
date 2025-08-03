<script setup lang="tsx">
import { useAppSettings } from '@/hooks/app-settings'
import { useMagicKeys, useRefHistory, whenever, type UseRefHistoryRecord } from '@vueuse/core'
import { Modal } from 'ant-design-vue'
import AppDialog from './app-bookmark-dialog.vue'
import AppIcon from './app-bookmark-icon.vue'

import clsx from 'clsx'

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
		application: () => ({
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
		})
	}
)

const appDialogRef = ref<ApplicationDialog>()

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

function handleAppDialog() {
	if (props.settingsVisible) return
	appDialogRef.value = Modal.info({
		icon: null,
		title: null,
		footer: null,
		width: '80%',
		centered: true,
		maskClosable: true,
		class: clsx('app-dialog', 'bookmark-dialog'),
		content() {
			return (
				<AppDialog
					fullscreen={fullscreen.value}
					appDialogRef={appDialogRef.value}
					onUpdate:fullscreen={updateFullScreen}
				/>
			)
		}
	})
}

function updateFullScreen(value: boolean) {
	if (!appDialogRef.value) return
	fullscreen.value = value

	appDialogRef.value?.update({
		width: fullscreen.value ? '100%' : '80%',
		class: fullscreen.value ? 'fullscreen' : undefined
	})
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
		<AppIcon
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
			@click="handleAppDialog"
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
.app-dialog.bookmark-dialog {
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
