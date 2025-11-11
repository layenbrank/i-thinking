<script setup lang="tsx">
import MarketplaceSwiper from './marketplace-swiper.vue'

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

defineOptions({
	name: 'marketplace-game'
})

const props = withDefaults(
	defineProps<{
		applications: Application[]
	}>(),
	{}
)

const reflect: Application.Reflect = {
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

const options = ref([
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

const hasMultiple = computed(() => props.applications.length > 1)
</script>

<template>
	<div class="marketplace-game">
		<MarketplaceSwiper :options="options" :loop="hasMultiple">
			<template #slide="{ option }">
				<div class="image-container">
					<img :src="option.image" alt="" class="carousel-img" />
				</div>
			</template>
			<template #main>
				<h3>热门应用</h3>
				<TransitionGroup tag="div" name="application-fade" class="controller">
					<template v-for="application in applications" :key="application.id">
						<component
							:class="['application']"
							:settings-visible="false"
							:data-id="application.id"
							:application="application"
							:is="reflect[application.component]?.()"
						/>
					</template>
				</TransitionGroup>
			</template>
		</MarketplaceSwiper>
	</div>
</template>

<style lang="scss" scoped>
@use '@/styles/application.scss' as *;

.marketplace-game {
	.controller {
		@extend %controller;
	}

	.image-container {
		@apply w-full h-full flex items-center justify-center rounded-lg overflow-hidden;
		backdrop-filter: blur(60px);
		background-color: rgba(0, 0, 0, 0.52);
	}

	.carousel-img {
		@apply h-full object-contain rounded-lg;
	}
}
</style>
