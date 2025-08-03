<script setup lang="ts">
import SettingDirection from './setting-direction.vue'
import SettingShape from './setting-shape.vue'
import SettingSize from './setting-size.vue'

defineOptions({
	name: 'app-settings-window'
})

const props = withDefaults(
	defineProps<{
		appDialogRef?: ApplicationWindowType
	}>(),
	{}
)

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
	}
]
</script>

<template>
	<div class="app-settings-window">
		<a-tabs tab-position="left" v-model:activeKey="activeKey" class="app-settings-tabs">
			<a-tab-pane v-for="option in options" :key="option.value" :tab="option.label">
				<component :is="option.component" />
			</a-tab-pane>
		</a-tabs>
	</div>
</template>

<style lang="scss" scoped>
.app-settings-window {
	@apply w-full h-full flex items-center justify-center;

	.app-settings-tabs {
		width: 100%;
		height: 100%;
	}
}
</style>
