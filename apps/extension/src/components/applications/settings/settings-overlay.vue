<script setup lang="ts">
import { resize } from '@desktop-app/core'
import { Icon } from '@iconify/vue'
import SettingBackground from './setting-background.vue'
import SettingDirection from './setting-direction.vue'
import SettingShape from './setting-shape.vue'
import SettingSize from './setting-size.vue'

defineOptions({
	directives: {
		resize
	},
	name: 'settings-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})

const emits = defineEmits<{
	(e: 'update:visible', value: boolean): void
	(e: 'update:fullscreen', value: boolean): void
}>()

const activeKey = ref('size')

const options = [
	{
		label: '大小',
		value: 'size',
		component: SettingSize
	},
	{
		label: '方向',
		value: 'direction',
		component: SettingDirection
	},
	{
		label: '形状',
		value: 'shape',
		component: SettingShape
	},
	{
		label: '背景',
		value: 'background',
		component: SettingBackground
	}
]

onMounted(function () {
	//
})
</script>
<!--
<i data-icon="academicons:acclaim-square" size="24" class="iconify size-5"></i>
<span class="iconify size-5" data-icon="academicons:academia-square"></span>
<Icon icon="ant-design:align-left-outlined"></Icon>
-->
<template>
	<div class="settings-overlay">
		<!-- <div class="settings-head">
			<span>应用设置</span>
			<Icon
				@click="emits('update:visible', false)"
				icon="ant-design:close-circle-filled"
				class="destroy-marker"
			/>
		</div> -->
		<a-tabs tab-position="left" v-model:activeKey="activeKey" class="app-settings-tabs">
			<a-tab-pane v-for="option in options" :key="option.value" :tab="option.label">
				<component :is="option.component" />
			</a-tab-pane>
		</a-tabs>
	</div>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.settings-overlay {
	width: 100%;
	height: 100%;
	position: relative;

	$height: 40px;

	.settings-head {
		height: $height;
		display: flex;
		position: relative;
		align-items: center;
		justify-content: center;
		background-color: #d1d5db;
		box-shadow: 0px 1px 0px 0px rgba($color: #000000, $alpha: 0.3);

		span {
			margin-bottom: 0px;
		}
	}

	:deep(.destroy-marker) {
		width: 20px;
		height: 20px;
		top: 0px;
		right: 0px;
		cursor: pointer;
		position: absolute;
		color: rgba($color: #000000, $alpha: 0.5);

		&:hover {
			color: rgba($color: #000000, $alpha: 1);
		}
	}

	.app-settings-tabs {
		width: 100%;
		height: 100%;
		// height: calc(100% - $height);
	}

	:deep(.ant-tabs-content-holder) {
		height: 100%;
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: 0%;
	}

	:deep(.ant-tabs-content) {
		height: 100%;

		.ant-tabs-tabpane {
			padding: 0px;
		}
	}

	:deep(.ant-tabs-tabpane) {
		height: 100%;
		padding: 0px;
	}
}
</style>
