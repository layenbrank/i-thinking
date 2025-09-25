<script setup lang="tsx">
import { randomID } from '@/utils/generate.ts'
import 'swiper/scss'
import 'swiper/scss/navigation'
import 'swiper/scss/pagination'
import type { AutoplayOptions } from 'swiper/types'
import type { Reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import StoreAihub from './store-aihub.vue'
import StoreApplication from './store-application.vue'
import StoreCustomization from './store-customization.vue'
import StoreGame from './store-game.vue'

type ReflectComponent = 'application' | 'game' | 'ai' | 'customization'

interface GeneralOptions {
	label: string
	key: ReflectComponent
}

defineOptions({
	name: 'app-store-window'
})

// const props = withDefaults(defineProps<{}>(), {})

const { t } = useI18n()

const applications: Application[] = [
	{
		id: randomID(),
		slideID: randomID(),
		sort: 1,
		component: 'app-bookmark',
		width: '60px',
		height: '60px',
		size: 'mini',
		// direction: 'horizontal',
		direction: 'vertical',
		// shape: 'rectangle',
		// shape: 'square',
		shape: 'circle',
		round: '12px',
		icon: 'https://cdn.jsdelivr.net/gh/vuejs/vuejs.org@master/public/images/favicon.ico',
		name: '书签',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 2,
		component: 'app-calendar',
		width: '60px',
		height: '60px',
		size: 'medium',
		direction: 'horizontal',
		// shape: 'square',
		shape: 'rectangle',
		round: '12px',
		name: '日历',
		icon: '',
		backgroundColor: '#fff',
		backgroundImage: null,
		// backgroundImage: SlideView,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 3,
		component: 'app-store',
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
		icon: '',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 3,
		component: 'app-navigation',
		url: 'https://www.baidu.com',
		size: 'mini',
		round: '8px',
		width: '60px',
		height: '60px',
		direction: 'horizontal',
		shape: 'square',
		name: '百度',
		icon: 'https://www.baidu.com/favicon.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 5,
		component: 'app-navigation',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '微信',
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 6,
		component: 'app-example',
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
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	}
]

const activeKey = ref<GeneralOptions>({
	label: t('General.Application'),
	key: 'application'
})

const reflect: Record<ReflectComponent, Component> = {
	ai: StoreAihub,
	game: StoreGame,
	application: StoreApplication,
	customization: StoreCustomization
}

const options: GeneralOptions[] = [
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

const autoplay: Reactive<AutoplayOptions> = reactive({
	delay: 3000,
	pauseOnMouseEnter: true,
	disableOnInteraction: false
})

function updateActiveKey(item: GeneralOptions) {
	activeKey.value = item
}
</script>

<template>
	<div class="app-store-window">
		<div class="store-categories">
			<div
				:key="option.key"
				v-for="option in options"
				@click="updateActiveKey(option)"
				:class="[
					'store-category',
					{
						'is-active': activeKey.key === option.key
					}
				]"
			>
				{{ option.label }}
			</div>
		</div>
		<div class="store-content">
			<template v-for="option in options">
				<component
					:key="option.key"
					class="content-item"
					:is="reflect[activeKey.key]"
					v-if="activeKey.key === option.key"
					:applications="applications"
				></component>
			</template>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.app-store-window {
	@apply h-full flex justify-between gap-x-2;

	.store-categories {
		@apply w-20 h-full flex flex-col items-center gap-y-1 rounded-l-lg overflow-x-hidden overflow-y-scroll  bg-[#fbeff5] p-2;
		scrollbar-width: none;

		.store-category {
			@apply w-full px-2 py-2 text-center rounded-md cursor-pointer transition-all duration-300;

			&:hover,
			&.is-active {
				@apply bg-white;
			}
		}
	}

	.store-content {
		@apply flex-1 rounded-r-lg overflow-x-hidden overflow-y-scroll pt-2 pr-2 pb-2;
		scrollbar-width: none;
		// --swiper-navigation-size: 30px;

		.content-item {
			@apply w-full h-full overflow-x-hidden overflow-y-scroll;
		}
	}
}
</style>
