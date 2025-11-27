<script setup lang="ts">
import { A11y, Autoplay, Mousewheel, Navigation, Pagination } from 'swiper/modules'
import type { AutoplayOptions, PaginationOptions, SwiperModule } from 'swiper/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Reactive } from 'vue'

defineOptions({
	name: 'marketplace-swiper'
})

withDefaults(
	defineProps<{
		modules?: SwiperModule[]
		pagination?: PaginationOptions
		loop?: boolean
		options?: { label: string; key: string; image: string }[]
	}>(),
	{
		modules() {
			return [A11y, Autoplay, Mousewheel, Navigation, Pagination]
		},
		pagination() {
			return {
				enabled: true,
				clickable: true
			}
		},
		loop: false
	}
)

const autoplay: Reactive<AutoplayOptions> = reactive({
	delay: 3000,
	pauseOnMouseEnter: true,
	disableOnInteraction: false
})
</script>

<template>
	<div class="marketplace-swiper">
		<swiper
			:modules="modules"
			:mousewheel="true"
			:space-between="20"
			:navigation="false"
			direction="horizontal"
			:slides-per-view="1.15"
			:autoplay="autoplay"
			:pagination="pagination"
			:allow-touch-move="false"
			:loop="loop"
			class="swiper-marketplace w-full h-60"
		>
			<swiper-slide
				:key="option.key"
				v-for="option in options"
				:style="{
					backgroundImage: `url(${option.image})`
				}"
			>
				<!-- <div class="image-container">
					<img :src="option.image" alt="" class="carousel-img" />
				</div> -->
				<slot name="slide" :option="option"></slot>
			</swiper-slide>
		</swiper>
		<div class="marketplace-main">
			<slot name="main"></slot>
			<!-- <h3>热门应用</h3> -->
			<!-- <transition-group tag="div" name="app-controller-fade" class="app-controller">
				<template v-for="application in applications" :key="application.id">
					<component
						:class="['application']"
						:settings-visible="false"
						:data-id="application.id"
						:application="application"
						:is="applicationReflect[application.component]?.()"
					/>
				</template>
			</transition-group> -->
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use 'general.scss' as *;

.marketplace-swiper {
	width: 100%;
	height: 100%;

	.swiper-marketplace {
		@extend %swiper-marketplace;
	}
}
</style>
