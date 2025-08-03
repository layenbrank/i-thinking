<script setup lang="tsx">
import { useAppSettings } from '@/hooks/app-settings'
import { Modal } from 'ant-design-vue'
import clsx from 'clsx'
import AppIcon from './app-calendar-icon.vue'
import ApplicationWindow from './app-calendar-window.vue'

defineOptions({
	name: 'app-calendar'
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
				app: 'app-calendar',
				round: '12px',
				slideID: '0',
				sort: 0,
				size: 'medium',
				name: '示例',
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

const appDialogRef = ref<ApplicationWindowType>()

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
	if (medium.value && rectangle.value) return
	appDialogRef.value = Modal.info({
		icon: null,
		title: null,
		footer: null,
		width: '80%',
		centered: true,
		maskClosable: true,
		class: clsx('application-window calendar-dialog'),
		style: {
			transformOrigin: 'center'
		},
		content() {
			return <ApplicationWindow appDialogRef={appDialogRef.value} />
		}
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
		:class="['app-calendar', application.size, application.shape, application.direction]"
	>
		<a-modal
			:icon="null"
			:title="null"
			:footer="null"
			width="80%"
			:centered="true"
			:mask-closable="true"
			:style="{
				transformOrigin: 'center'
			}"
			class="application-window calendar-dialog"
		>
			<application-window />
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
			@click="handleAppDialog"
		/>
		<span class="app-name">{{ application.name }}</span>
		<i-local:close class="app-trash-icon" />
	</div>
</template>

<style lang="scss" scoped>
.app-calendar {
	width: var(--app-size-width);
	height: var(--app-size-height);
	grid-row: var(--app-grid-row);
	grid-column: var(--app-grid-column);
	border-radius: var(--app-round);
	background: var(--app-background);
}
</style>
<style lang="scss">
.application-window.calendar-dialog {
	div[tabindex='0'][style='outline: none;'] {
		@apply w-full h-full;
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
		@apply bg-white rounded-lg;
	}
}
</style>
