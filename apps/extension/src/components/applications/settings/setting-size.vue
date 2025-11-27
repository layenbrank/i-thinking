<script setup lang="ts">
import { useStore } from '@/components/applications/settings/settings.ts'
import { useMirror } from '@/hooks/mirror'
import { useMirrorStore } from '@/stores/mirror.ts'

defineOptions({
	name: 'setting-size'
})

interface SizeOptions {
	label: string
	value: Application.Size
}

const store = useMirrorStore()
const { APPLICATION } = useMirror()
const { active, updateActive, updateSetting } = useStore()

const options: SizeOptions[] = [
	{
		label: '迷你',
		value: 'mini'
	},
	{
		label: '小型',
		value: 'small'
	},
	{
		label: '中型',
		value: 'medium'
	},
	{
		label: '大型',
		value: 'large'
	},
	{
		label: '超大',
		value: 'huge'
	},
	{
		label: '巨大',
		value: 'massive'
	},
	{
		label: '超极大',
		value: 'ultra'
	}
]

function unifySetting(application: Application) {
	const unify: Application = {
		...application,
		size: 'mini',
		shape: 'square',
		round: '8px',
		textColor: '#000000',
		direction: 'horizontal'
	}
	return unify
}
</script>

<template>
	<div class="setting-size">
		<div class="collection-preview">
			<div class="collection-scroll">
				<div @click="updateActive" @dblclick.capture.stop.prevent class="collection-layout">
					<component
						:key="application.id"
						:class="['application']"
						:data-id="application.id"
						v-for="application in store.applications"
						:is="APPLICATION[application.component]"
						:application="unifySetting(application)"
					/>
				</div>
			</div>
		</div>
		<div class="application-preview">
			<a-radio-group
				class="size-radio-group"
				@update:value="updateSetting?.('size', $event)"
				:value="active?.size ?? 'mini'"
			>
				<a-radio-button
					:key="size.value"
					:value="size.value"
					v-for="size in options"
					:class="['size-radio', size.value]"
				>
					{{ size.label }}
				</a-radio-button>
			</a-radio-group>
			<div class="application-scroll">
				<div @dblclick.capture.stop.prevent class="application-layout">
					<component
						:key="active?.id"
						:class="['application']"
						:data-id="active?.id"
						v-if="active?.component"
						:is="APPLICATION[active.component]"
						:application="active"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/styles/application.scss' as *;

.setting-size {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: row;
	color: #000;

	.collection-preview,
	.application-preview {
		// border-radius: 8px;
	}

	.collection-preview {
		width: 100px;
		height: 100%;
		padding-block: 8px;
	}

	.collection-scroll {
		width: 100%;
		height: 100%;
		overflow-x: hidden;
		overflow-y: scroll;
		scroll-behavior: smooth;
	}

	.collection-layout {
		width: 100%;
		@extend %controller;
	}

	.application-preview {
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: 0%;
		min-width: 0px;
		height: 100%;
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		padding-inline: 8px 2px;
		padding-block: 8px 2px;
	}

	.size-radio-group {
		padding-inline: 20px;
		margin-inline: auto;
		background-color: #fff;
		border-radius: 16px;

		.size-radio {
			border: none;

			&::before {
				content: none;
			}
		}
	}

	.application-scroll {
		width: 100%;
		flex-grow: 1;
		flex-shrink: 1;
		flex-basis: 0%;
		min-height: 0px;
		overflow-x: scroll;
		overflow-y: scroll;
		scroll-behavior: smooth;
	}
	.application-layout {
		width: 100%;

		@extend %controller;
		margin: 0;
		padding: 0;
		justify-content: flex-start;
	}
}
</style>
