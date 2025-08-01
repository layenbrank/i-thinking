<script setup lang="ts">
import clsx from 'clsx'
import type { BaseLayoutOptions } from '../index.ts'

defineOptions({
	name: 'BaseLayout'
})

withDefaults(defineProps<BaseLayoutOptions>(), {})
</script>

<template>
	<a-layout
		v-bind="baseLayout"
		:style="baseLayout?.style"
		:class="['base-layout', clsx(baseLayout?.class)]"
	>
		<a-layout-sider
			v-bind="baseSider"
			:style="baseSider?.style"
			:class="['base-sider', clsx(baseSider?.class)]"
		>
			<slot name="sider"></slot>
		</a-layout-sider>

		<a-layout
			v-bind="baseMain"
			:style="baseMain?.style"
			:class="['base-main', clsx(baseMain?.class)]"
		>
			<a-layout-header
				v-bind="baseHeader"
				:style="baseHeader?.style"
				:class="['base-header', clsx(baseHeader?.class)]"
			>
				<slot name="header"></slot>
			</a-layout-header>
			<a-layout-content
				v-bind="baseContent"
				:style="baseContent?.style"
				:class="['base-content', clsx(baseContent?.class)]"
			>
				<slot name="content"></slot>
			</a-layout-content>
			<a-layout-footer
				v-bind="baseFooter"
				:style="baseFooter?.style"
				:class="['base-footer', clsx(baseFooter?.class)]"
			>
				<slot name="footer"></slot>
			</a-layout-footer>
		</a-layout>
	</a-layout>
</template>

<style lang="scss" scoped>
.base-layout {
	@apply w-full h-full;
}
</style>
