<script setup lang="tsx">
import { randomID } from '@/utils/generate.ts'
import { A11y, Autoplay, Mousewheel, Navigation, Pagination } from 'swiper/modules'
import 'swiper/scss'
import 'swiper/scss/navigation'
import 'swiper/scss/pagination'
import type { PaginationOptions, SwiperModule } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Reactive } from 'vue'
import { useI18n } from 'vue-i18n'

const AppBookmark = defineAsyncComponent(function () {
	return import('@/components/applications/bookmark/bookmark.vue')
})
const AppCalendar = defineAsyncComponent(function () {
	return import('@/components/applications/calendar/calendar.vue')
})
const AppMarkdown = defineAsyncComponent(function () {
	return import('@/components/applications/markdown/markdown.vue')
})
const AppNavigation = defineAsyncComponent(function () {
	return import('@/components/applications/navigation/navigation.vue')
})
const AppExample = defineAsyncComponent(function () {
	return import('@/components/applications/example/example.vue')
})

interface AppMarketplaceOptions {
	label: string
	key: string
}

defineOptions({
	name: 'marketplace-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})

const { t } = useI18n()

const modules: SwiperModule[] = [A11y, Autoplay, Mousewheel, Navigation, Pagination]

const activeKey = ref<AppMarketplaceOptions>({
	label: t('General.Application'),
	key: 'application'
})

const options: AppMarketplaceOptions[] = [
	{
		label: t('General.Application'),
		key: 'application'
	},
	{
		label: t('General.Game'),
		key: 'game'
	},
	{
		label: t('General.AI-Hub'),
		key: 'ai'
	},
	{
		label: t('General.Customization'),
		key: 'customization'
	}
]

const applicationReflect: Application.Reflect = {
	bookmark() {
		return <AppBookmark />
	},
	calendar() {
		return <AppCalendar />
	},
	example() {
		return <AppExample />
	},
	navigation() {
		return <AppNavigation />
	},
	markdown() {
		return <AppMarkdown />
	}
}

const applications: readonly Application[] = [
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 1,
		component: 'bookmark',
		width: '60px',
		height: '60px',
		size: 'mini',
		// direction: 'horizontal',
		direction: 'vertical',
		// shape: 'rectangle',
		// shape: 'square',
		shape: 'circle',
		round: '12px',
		marker: 'https://cdn.jsdelivr.net/gh/vuejs/vuejs.org@master/public/images/favicon.ico',
		name: '书签',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 2,
		component: 'calendar',
		width: '60px',
		height: '60px',
		size: 'medium',
		direction: 'horizontal',
		// shape: 'square',
		shape: 'rectangle',
		round: '12px',
		name: '日历',
		marker: '',
		backgroundColor: '#fff',
		backgroundImage: null,
		// backgroundImage: SlideView,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 3,
		component: 'marketplace',
		width: '60px',
		height: '60px',
		// round: null,
		round: '15px',

		size: 'mini',
		// size: 'small',
		// size: 'medium',
		// size: 'large',

		// direction: 'horizontal',
		direction: 'vertical',

		// shape: 'circle',
		shape: 'square',
		// shape: 'rectangle',

		name: '应用商店',
		marker: '',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 3,
		component: 'navigation',
		url: 'https://www.baidu.com',
		size: 'mini',
		round: '8px',
		width: '60px',
		height: '60px',
		direction: 'horizontal',
		shape: 'square',
		name: '百度',
		marker: 'https://www.baidu.com/favicon.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 5,
		component: 'navigation',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '微信',
		marker: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: randomID(),
		mirrorID: randomID(),
		sort: 6,
		component: 'example',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		round: '12px',

		size: 'mini',
		// size: 'small',
		// size: 'medium',
		// size: 'large',
		// size: 'huge',
		// size: 'massive',
		// size: 'ultra',

		// direction: 'horizontal',
		direction: 'vertical',

		// shape: 'square',
		// shape: 'rectangle',
		shape: 'circle',
		name: '微信1',
		marker: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	}
]

const swiperOptions = ref([
	{
		label: '主页',
		key: 'home',
		image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel1.jpeg'
	},
	{
		label: '应用',
		key: 'application',
		image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel2.jpeg'
	},
	{
		label: '游戏',
		key: 'game',
		image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel3.jpeg'
	},
	{
		label: 'AI Hub',
		key: 'ai',
		image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel4.jpeg'
	},
	{
		label: '自定义',
		key: 'customization',
		image: 'https://naive-ui.oss-cn-beijing.aliyuncs.com/carousel-img/carousel5.jpeg'
	}
])

const hasMultiple = computed(() => swiperOptions.value.length > 1)

const pagination: Reactive<PaginationOptions> = reactive({
	enabled: true,
	clickable: true
})

function updateActiveKey(item: AppMarketplaceOptions) {
	activeKey.value = item
}
</script>

<template>
	<div class="marketplace-overlay">
		<div class="marketplace-categories">
			<div
				:key="item.key"
				v-for="item in options"
				@click="updateActiveKey(item)"
				:class="[
					'marketplace-category',
					{
						'is-active': activeKey.key === item.key
					}
				]"
			>
				{{ item.label }}
			</div>
		</div>
		<div class="marketplace-content">
			<template v-for="item in options">
				<div v-if="activeKey.key === item.key" :key="item.key" class="content-item">
					<swiper
						:modules="modules"
						:mousewheel="true"
						:space-between="20"
						:navigation="false"
						direction="horizontal"
						:slides-per-view="1.15"
						:pagination="pagination"
						:allow-touch-move="false"
						:loop="hasMultiple"
						class="marketplace-swiper w-full h-60"
					>
						<swiper-slide
							:key="option.key"
							v-for="option in swiperOptions"
							:style="{
								backgroundImage: `url(${option.image})`
							}"
						>
							<div class="image-container">
								<img :src="option.image" alt="" class="carousel-img" />
							</div>
						</swiper-slide>
					</swiper>
					<div class="marketplace-main">
						<h3>热门应用</h3>
						<transition-group tag="div" name="app-controller-fade" class="app-controller">
							<template v-for="application in applications" :key="application.id">
								<component
									:class="['application']"
									:settings-visible="false"
									:data-id="application.id"
									:application="application"
									:is="applicationReflect[application.component]?.()"
								/>
							</template>
						</transition-group>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.marketplace-overlay {
	@apply h-full flex justify-between gap-x-2;

	.marketplace-categories {
		@apply w-20 h-full flex flex-col items-center gap-y-1 rounded-l-lg overflow-x-hidden overflow-y-scroll  bg-[#fbeff5] p-2;
		scrollbar-width: none;

		.marketplace-category {
			@apply w-full px-2 py-2 text-center rounded-md cursor-pointer transition-all duration-300;

			&:hover,
			&.is-active {
				@apply bg-white;
			}
		}
	}

	.marketplace-content {
		@apply flex-1 rounded-r-lg overflow-x-hidden overflow-y-scroll pt-2 pr-2 pb-2;
		scrollbar-width: none;
		// --swiper-navigation-size: 30px;

		.content-item {
			@apply w-full h-full overflow-x-hidden overflow-y-scroll;
		}

		.marketplace-swiper {
			@apply w-full h-[60%];
			@apply overflow-hidden rounded-lg;
			--swiper-navigation-size: 30px;

			:deep(.swiper-wrapper) {
				@apply w-full h-full;
			}

			:deep(.swiper-slide) {
				@apply w-full h-full rounded-lg overflow-hidden;
				background-repeat: no-repeat;
				background-position: center;
				background-size: cover;
				background-attachment: fixed;

				&.swiper-slide-active {
				}
				&.swiper-slide-next {
				}
			}

			.image-container {
				@apply w-full h-full flex items-center justify-center rounded-lg overflow-hidden;
				backdrop-filter: blur(60px);
				background-color: rgba(0, 0, 0, 0.52);
			}

			.carousel-img {
				@apply h-full object-contain rounded-lg;
			}

			:deep(.swiper-pagination) {
				$bullet-height: 6px;

				.swiper-pagination-bullet {
					@apply bg-[#ccc] rounded-full opacity-50 transition-all duration-300;
					height: $bullet-height;

					&.swiper-pagination-bullet-active {
						@apply w-[34px] opacity-100;
						background: var(--color-ref-primary60, #4c8df6ff);
						border-radius: ($bullet-height * 1.67);
					}

					&:not(.swiper-pagination-bullet-active) {
						width: $bullet-height;
					}
				}
			}
		}

		.app-controller {
			display: grid;
			padding: 20px;
			margin: 0 auto;
			justify-content: center;
			grid-auto-flow: row dense;

			outline: none;
			scrollbar-width: none;
			row-gap: var(--application-global-row-gap, 30px);
			column-gap: var(--application-global-col-gap, 30px);
			grid-template-rows: repeat(auto-fill, var(--application-global-height, 60px));
			grid-template-columns: repeat(auto-fill, var(--application-global-width, 60px));

			transition:
				width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				height 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				row-gap 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
				column-gap 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

			:deep(:where(.application)) {
				@apply relative cursor-pointer text-center;

				transition:
					box-shadow 300ms,
					width 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
					height 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
					grid-row 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
					grid-column 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

				&
					> :where(
						div:is([class*=' app-'], [class^='app-']):is([class*='-icon '], [class$='-icon'])
					) {
					@apply w-full h-full transition-all;
				}

				& > :where(span.app-name) {
					@apply block truncate w-full mt-1;
					color: var(--application-global-text-color);
					font-size: var(--application-global-text-size);
				}

				& > :where(.app-trash-icon) {
					@apply w-5 h-5 absolute -top-[8px] -right-[8px] items-center justify-center bg-[#00000033] rounded-full p-[5px] transition-[background];
					@apply hidden;

					&:hover {
						@apply bg-[#d83030];
					}
				}
			}
		}
	}
}
</style>
