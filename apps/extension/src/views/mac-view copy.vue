<script setup lang="ts">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import { useDateFormat, useTimestamp } from '@vueuse/core'
import { Modal } from 'ant-design-vue'

defineOptions({
	name: 'mac-view'
})

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

function updateKeyword(value: string) {
	keyword.value = value
}

function updateSearch() {
	window.open(`https://cn.bing.com/search?q=${keyword.value}`, '_blank')
}

const visible = ref(false)

function toggle() {
	visible.value = !visible.value
}

onMounted(function () {})

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
				<a-button> 镜像 </a-button>
				<a-button> 编辑 </a-button>
				<a-button> 显示 </a-button>
				<a-button> 窗口 </a-button>
				<a-button> 帮助 </a-button>
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
							placeholder="请输入关键词!"
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
			<!-- <a-layout-sider width="200" class="mac-begin"></a-layout-sider> -->
			<a-layout
				:style="{
					width: visible ? 'calc(100% - 400px)' : 'calc(100% - 200px)'
				}"
				class="mac-main"
			>
				<a-layout-content @contextmenu.prevent class="mac-content"> </a-layout-content>
				<a-layout-footer @contextmenu.prevent class="mac-footer">
					<template v-for="value in 1000"> {{ value }} </template>
				</a-layout-footer>
			</a-layout>
			<a-layout-sider
				:collapsed="!visible"
				collapsed-width="0"
				width="200"
				class="mac-final"
			></a-layout-sider>
		</a-layout>
	</a-layout>
</template>

<style lang="scss" scoped>
.mac-view {
	width: 100%;
	height: 100%;
	$top-height: 36px;
	$bottom-height: 80px;
	background-color: transparent;

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
		flex: none;
		background-color: transparent;
		transition: width 300ms linear;
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
		@apply truncate;
	}

	.mac-begin {
		height: 100%;
		// transition:
		// 	width 300ms linear,
		// 	flex 300ms linear;
		// background-color: transparent;
	}

	.mac-final {
		height: 100%;
		// transition:
		// 	width 300ms linear,
		// 	flex 300ms linear;
		// background-color: transparent;
	}
}
</style>
