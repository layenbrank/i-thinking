<script setup lang="ts">
import backgroundImage from '@/assets/wallpaper/r2e391.png'
import { generateSecureCvid } from '@/utils/generate.ts'
import { http } from '@/utils/http/http.ts'
import { COREX_TOKEN } from '@/utils/http/token.ts'
import {
	onClickOutside,
	onKeyStroke,
	useCycleList,
	useDateFormat,
	useTimestamp,
	useWindowFocus
} from '@vueuse/core'
import { Modal } from 'ant-design-vue'
import { debounce } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import * as z from 'zod'
import AppleFilled from '~icons/local/apple-filled'
import BatteryFullOutline from '~icons/local/battery-full-outline'
import MacToggle from '~icons/local/mac-toggle'
import WifiMarker from '~icons/local/wifi'

const Controller = defineAsyncComponent(function () {
	return import('@/components/controller/controller.vue')
})

const TSchema = z.enum(['LT', 'MT', 'SC'])

const ISchema = z.object({
	ig: z.string()
})

const EmptySchema = z.object({
	id: z.string(),
	q: z.string(),
	u: z.string(),
	t: TSchema
})

const ResponseZodSchema = z.object({
	s: z.array(EmptySchema),
	i: ISchema
})
type ResponseZod = z.infer<typeof ResponseZodSchema>

defineOptions({
	name: 'mac-view'
})

const { t, locale } = useI18n()

const comboboxRef = useTemplateRef('comboboxRef')

const timestamp = useTimestamp({
	interval: 'requestAnimationFrame'
})

const focused = ref(false)

const windowFocused = useWindowFocus()

const keyword = ref('')

const queries = ref<ResponseZod>()

const {
	go: toNavigate,
	state: suggestion,
	prev: navigatePrev,
	next: navigateNext,
	index: navigation
} = useCycleList(computed(() => queries.value?.s ?? []))

const date = useDateFormat(timestamp, 'MM-DD', {})

const week = useDateFormat(timestamp, 'ddd', {})

const time = useDateFormat(timestamp, 'HH:mm:ss', {
	customMeridiem(hours) {
		return hours === 12 ? '正午' : hours < 12 ? '上午' : '下午'
	}
})

function updateKeyword(value: string) {
	keyword.value = value
	toQuery(value)
}
const cvid = generateSecureCvid()
const toQuery = debounce(function (value: string) {
	// https://cn.bing.com/AS/Suggestions?pt=page.home&qry=j&cp=1&csr=1&pths=1&cvid=313EA35317DD492295D155D6F708F74B

	// bing   313EA35317DD492295D155D6F708F74B
	// custom 0F96C1D8AE2D4E1280D591B9B1D5A020
	// http
	// 	.get<ResponseZod>('/AS/Suggestions', {
	http
		.get<RSF<ResponseZod>>('/engine/suggestion', {
			params: {
				pt: 'page.home',
				qry: value,
				cp: value.length,
				csr: '1',
				pths: '1',
				cvid: cvid
			},
			context: COREX_TOKEN
			// context: ENGINE_TOKEN
		})
		.subscribe(function (response) {
			console.log('bing response', response, 'cvid', cvid)
			if (!response) return
			queries.value = response.data
			// suggestions.value = response.s
			// console.log('suggestions', suggestions.value)
			//

			toNavigate(0)
		})
}, 300)

const visible = computed(function () {
	if (!focused.value) return false
	if (!keyword.value) return false
	if (!queries.value?.s.length) return false

	return true
})

onClickOutside(comboboxRef, function () {
	focused.value = false
})

onKeyStroke(['ArrowUp', 'ArrowDown'], function (e) {
	if (!visible.value) return
	if (!focused.value) return
	if (!keyword.value) return
	if (!queries.value?.s.length) return

	e.preventDefault()

	if (e.key === 'ArrowUp') navigatePrev()
	else if (e.key === 'ArrowDown') navigateNext()
})

watchEffect(function () {
	if (windowFocused.value) return
	focused.value = false
})

function updateQuery() {
	if (suggestion.value) {
		return window.open(`https://cn.bing.com/${suggestion.value.u}`, '_blank')
	}
	return window.open(`https://cn.bing.com/search?q=${keyword.value}`, '_blank')
}

function updateFocus(value: boolean) {
	focused.value = value
}

function toggleLanguage() {
	console.log([
		t('General.Week.Min.Mon'),
		t('General.Week.Min.Tue'),
		t('General.Week.Min.Wed'),
		t('General.Week.Min.Thu'),
		t('General.Week.Min.Fri'),
		t('General.Week.Min.Sat'),
		t('General.Week.Min.Sun')
	])

	console.log([
		t('General.Week.Max.Monday'),
		t('General.Week.Max.Tuesday'),
		t('General.Week.Max.Wednesday'),
		t('General.Week.Max.Thursday'),
		t('General.Week.Max.Friday'),
		t('General.Week.Max.Saturday'),
		t('General.Week.Max.Sunday')
	])

	locale.value = locale.value === 'en' ? 'zh-CN' : 'en'
}

onMounted(function () {
	// const keyword = '十日终焉'
	// http
	// 	.get('/engine/suggestion', {
	// params: {
	// 	pt: 'page.home',
	// 	qry: keyword,
	// 	cp: keyword.length,
	// 	csr: '1',
	// 	pths: '1',
	// 	cvid: cvid
	// },
	// 	context: COREX_TOKEN
	// })
	// .subscribe(function (response) {
	// 	console.log('response', response)
	// })
	// GET_APPLICATION().subscribe(function (response) {
	// 	console.log('application', response)
	// })
	// http.get(url)
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
						<apple-filled />
					</template>
				</a-button>
				<a-button> {{ $t('General.Mirror') }} </a-button>
				<a-button> {{ $t('General.Show') }} </a-button>
				<a-button> {{ $t('General.Window') }} </a-button>
				<a-button> {{ $t('General.Edit') }} </a-button>
				<a-button> {{ $t('General.Help') }} </a-button>
				<a-button @click="toggleLanguage">{{ $t('General.Language') }}</a-button>
			</a-space-compact>
			<a-space-compact class="flex">
				<a-button class="icon-wifi">
					<template #icon>
						<wifi-marker />
					</template>
				</a-button>
				<a-button class="icon-battery">
					<template #icon>
						<battery-full-outline />
					</template>
				</a-button>
				<combobox-trigger
					ref="comboboxRef"
					:inputProps="{
						value: keyword,
						onPressEnter: updateQuery,
						'onUpdate:value': updateKeyword,
						onFocus: () => updateFocus(true),
						placeholder: t('General.Please-Enter-Keywords')
					}"
				>
					<template #content>
						<transition name="combobox-fade">
							<a-card v-if="visible" class="combobox-card">
								<a-button
									block
									type="link"
									:key="value.id"
									target="_blank"
									v-for="(value, index) in queries?.s"
									:href="`https://cn.bing.com/${value.u}`"
									:class="[
										'navigation-link',
										{
											'is-active': navigation === index
										}
									]"
								>
									{{ value.q.replace(/[\uE000-\uF8FF]/g, '') }}
								</a-button>
							</a-card>
						</transition>
					</template>
				</combobox-trigger>

				<a-button class="icon-mac-toggle">
					<template #icon>
						<mac-toggle />
					</template>
				</a-button>
				<a-button class="date-time">
					<span> {{ date }} </span>
					<span> {{ week }} </span>
					<span> {{ time }} </span>
				</a-button>
			</a-space-compact>
		</a-layout-header>
		<a-layout class="mac-main">
			<a-layout-content @contextmenu.prevent class="mac-content">
				<Controller />
			</a-layout-content>
			<a-layout-footer @contextmenu.prevent class="mac-footer">
				<!-- <template #default>
					<div class="dock-bar"></div>
				</template> -->
				<a
					href="https://beian.mps.gov.cn/#/query/webSearch"
					target="_blank"
					rel="noopener noreferrer"
					class="text-white"
				>
					备案号：豫ICP备2023024760号
				</a>
			</a-layout-footer>
		</a-layout>
	</a-layout>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.mac-view {
	width: 100%;
	height: 100%;
	background-color: transparent;
	overflow: hidden;

	$top-height: 36px;
	$bottom-height: 80px;

	.mac-header {
		z-index: 3;
		width: 100%;
		height: $top-height;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 8px;
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
			margin-inline-start: 0;

			svg {
				@apply w-5 h-5;
			}
		}

		.combobox-trigger {
			width: 200px;

			:deep(.combobox-card) {
				max-height: 400px;
				height: 300px;
				border-top-left-radius: 0;
				border-top-right-radius: 0;
				padding: 4px;

				.ant-card-body {
					height: 100%;
					overflow: hidden scroll;
					padding: 0 4px 0 0;
				}
			}

			:deep(.navigation-link) {
				display: block;
				text-align: left;
				color: #000000;
				border-radius: 6px;

				span {
					width: 100%;
					display: block;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				&:hover,
				&.is-active {
					background-color: rgba($color: #4080ff, $alpha: 0.3);
				}
			}

			.combobox-fade {
				&-enter-active,
				&-leave-active {
					transform: translateY(0);
					transition:
						opacity 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
						transform 300ms cubic-bezier(0.165, 0.84, 0.44, 1);
				}
				&-enter-from,
				&-leave-to {
					opacity: 0;
					transform: translateY(-10px);
				}
			}
		}
	}

	.mac-main {
		width: 100%;
		height: calc(100% - $top-height);
		flex: none;
		background-color: transparent;
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
		padding: 0;
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
}
</style>
