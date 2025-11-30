<script setup lang="ts">
import { resize } from '@i-thinking/core'
import { reactive } from 'vue'
defineOptions({
	name: 'scroll-landscape',
	directives: {
		resize
	}
})

const emit = defineEmits<{
	'scroll-landscape': [event: Event]
}>()

const scrollRect = reactive<Pick<DOMRect, 'width' | 'height'>>({
	width: 0,
	height: 0
})

function handleResize(DOMRect: DOMRect) {
	scrollRect.width = DOMRect.width
	scrollRect.height = DOMRect.height
}

function handleScroll(event: Event) {
	emit('scroll-landscape', event)
}
</script>

<template>
	<div v-resize="handleResize" class="scroll-x-container">
		<div @scroll="handleScroll" class="scroll-x-wrapper">
			<div class="scroll-x-inner">
				<slot />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.scroll-x-container {
	.scroll-x-wrapper {
		--w: v-bind('scrollRect.width + "px"');
		--h: v-bind('scrollRect.height + "px"');
		width: calc(var(--h));
		height: calc(var(--w));
		overflow: hidden scroll;
		position: relative;
		transform-origin: left top;
		transform: translateY(var(--h)) rotate(-90deg);
		scrollbar-width: none;

		.scroll-x-inner {
			width: var(--w);
			height: var(--h);
			transform-origin: left top;
			transform: translateX(var(--h)) rotate(90deg);
		}
	}
}
</style>
