<script setup lang="ts">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import { useDateFormat, useTimestamp } from '@vueuse/core'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const AppController = defineAsyncComponent(function () {
	return import('@/components/app-controller/app-controller.vue')
})

defineOptions({
	name: 'mac-view'
})

const { t, locale } = useI18n()

const keyword = ref('')

const timestamp = useTimestamp({
	interval: 'requestAnimationFrame'
})

const date = useDateFormat(timestamp, 'MM-DD', {})

const week = useDateFormat(timestamp, 'ddd', {})

const time = useDateFormat(timestamp, 'HH:mm:ss', {
	customMeridiem(hours, minutes, isLowercase, hasPeriod) {
		return hours === 12 ? '正午' : hours < 12 ? '上午' : '下午'
	}
})

const collapse = reactive({
	width: 350
})

function updateKeyword(value: string) {
	keyword.value = value
}

function updateSearch() {
	window.open(`https://cn.bing.com/search?q=${keyword.value}`, '_blank')
}

const visible = ref(false)

function toggle() {
	visible.value = false
	// visible.value = !visible.value
}

function toggleLanguage() {
	console.log([
		t('general.week.min.Mon'),
		t('general.week.min.Tue'),
		t('general.week.min.Wed'),
		t('general.week.min.Thu'),
		t('general.week.min.Fri'),
		t('general.week.min.Sat'),
		t('general.week.min.Sun')
	])

	console.log([
		t('general.week.max.Monday'),
		t('general.week.max.Tuesday'),
		t('general.week.max.Wednesday'),
		t('general.week.max.Thursday'),
		t('general.week.max.Friday'),
		t('general.week.max.Saturday'),
		t('general.week.max.Sunday')
	])

	locale.value = locale.value === 'en' ? 'zh-CN' : 'en'
}

onMounted(function () {
	// console.log('mac-view mounted', visible.value)
})

onUnmounted(function () {
	Modal.destroyAll()
})
</script>

<template>
	<a-layout
		:style="{
			backgroundImage: `url(${backgroundImage})`,
			backgroundRepeat: 'no-repeat',
			backgroundSize: 'cover',
			backgroundAttachment: 'fixed',
			backgroundOrigin: 'content-box',
			backgroundClip: 'content-box',
			backgroundPosition: 'center'
		}"
		class="mac-view"
	>
		<a-layout-header @contextmenu.prevent class="mac-header">
			<a-space-compact class="flex">
				<a-button class="icon-apple">
					<template #icon>
						<i-local:apple-filled />
					</template>
				</a-button>
				<a-button> {{ $t('general.mirror') }} </a-button>
				<a-button> {{ $t('general.show') }} </a-button>
				<a-button> {{ $t('general.window') }} </a-button>
				<a-button> {{ $t('general.edit') }} </a-button>
				<a-button> {{ $t('general.help') }} </a-button>
				<a-button @click="toggleLanguage">{{ $t('general.language') }}</a-button>
			</a-space-compact>
			<a-space-compact class="flex">
				<a-button class="icon-wifi">
					<template #icon>
						<i-local:wifi />
					</template>
				</a-button>
				<a-button class="icon-battery">
					<template #icon>
						<i-local:battery-full-outline />
					</template>
				</a-button>
				<a-popover placement="bottom" trigger="click" class="popover-input">
					<template #trigger>
						<a-button class="icon-search">
							<template #icon>
								<i-local:search />
							</template>
						</a-button>
					</template>
					<template #default>
						<a-input
							@keydown.enter="updateSearch"
							:model-value="keyword"
							@update-value="updateKeyword"
							round
							:placeholder="$t('general.please-enter-keywords')"
						/>
					</template>
				</a-popover>
				<a-button class="icon-mac-toggle">
					<template #icon>
						<i-local:mac-toggle @click="toggle" />
					</template>
				</a-button>
				<a-button class="date-time">
					<span> {{ date }} </span>
					<span> {{ week }} </span>
					<span> {{ time }} </span>
				</a-button>
			</a-space-compact>
		</a-layout-header>
		<a-layout class="mac-container">
			<a-layout
				:style="{
					'--collapsed-width': `${collapse.width}px`
				}"
				:class="[
					'mac-main',
					{
						visible: visible
					}
				]"
			>
				<a-layout-content @contextmenu.prevent class="mac-content">
					<app-controller />
				</a-layout-content>
				<a-layout-footer @contextmenu.prevent class="mac-footer">
					<template #default>
						<div class="dock-bar"></div>
					</template>
				</a-layout-footer>
			</a-layout>

			<a-layout-sider
				:collapsed="!visible"
				:width="collapse.width"
				:collapsed-width="collapse.width"
				:class="[
					'mac-final',
					{
						visible: !visible
					}
				]"
			></a-layout-sider>
		</a-layout>
	</a-layout>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.mac-view {
	width: 100%;
	height: 100%;
	$top-height: 36px;
	$bottom-height: 80px;
	background-color: transparent;
	overflow: hidden;

	.mac-header {
		width: 100%;
		height: $top-height;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0px 8px;
		border-radius: 8px;
		background-color: rgba($color: #ffffff, $alpha: 0.3);
		backdrop-filter: blur(12px);
		filter: brightness(1.1);

		.icon-apple {
		}

		.icon-wifi {
		}

		.icon-battery {
		}

		.icon-search {
		}

		.date-time {
		}

		.icon-wifi,
		.icon-apple,
		.icon-battery,
		.icon-mac-toggle {
			width: initial;
			@apply px-2 py-1 block;
			margin-inline-start: 0px;

			svg {
				@apply w-5 h-5;
			}
		}
	}

	.mac-container {
		width: 100%;
		height: calc(100% - $top-height);
		flex: none;
		background-color: transparent;
	}

	.mac-main {
		width: 100%;
		flex: none;
		background-color: transparent;
		transition: width 300ms cubic-bezier(0.39, 0.575, 0.565, 1);

		/* TODO: 暂时没用到,后续可能移除 visible 相关 */
		&.visible {
			width: calc(100% - var(--collapsed-width, 350px));
		}
	}

	.mac-content {
		width: 100%;
		height: calc(100% - $bottom-height);
		flex: none;
		background-color: transparent;
	}

	.mac-footer {
		width: 100%;
		height: $bottom-height;
		padding: 0px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		background-color: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		outline: 1px solid red;

		.dock-bar {
			width: 80%;
			height: 80%;
			border-radius: math.div($bottom-height, 10);
			background-color: rgba($color: #ffffff, $alpha: 0.3);
			color: rgba(64, 128, 255, 0.8);
		}
	}

	.mac-begin {
		height: 100%;
	}

	.mac-final {
		height: 100%;
	}
}
</style>
