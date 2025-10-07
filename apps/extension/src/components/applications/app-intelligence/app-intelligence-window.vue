<script setup lang="ts">
defineOptions({
	name: 'app-intelligence-window'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()
</script>

<template>
	<div class="app-intelligence-window">
		<div class="histories-area">
			<div class="histories">
				<div v-for="value in 9" :key="value" class="history">{{ value }}</div>
				<div class="history">{{ 10 }}</div>
			</div>
		</div>
		<!-- 视觉区域和输入区域 -->
		<div class="thinking-area">
			<div class="visual-area"></div>
			<div class="input-area"></div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.app-intelligence-window {
	$columns: 24;
	$begin: 1;
	$final: 4;

	width: 100%;
	height: 100%;
	display: grid;
	grid-template-columns: repeat($columns, 1fr);

	.histories-area {
		grid-column: $begin / span $final;
		background-color: rgba($color: #f5b9b9, $alpha: 1);
		width: 100%;
		height: 100%;
		overflow: auto;
	}

	.histories {
		display: flex;
		flex-direction: column;
	}

	.history {
		padding: 8px 12px;
		border-bottom: 1px solid #eee;

		&:last-child {
			border-bottom: none;
		}
	}

	.thinking-area {
		grid-column: ($final + 1) / span ($columns - $final);
		background-color: rgba($color: #b9d8f5, $alpha: 1);
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-rows: 3fr 1fr;
	}
}
</style>
