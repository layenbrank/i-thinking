<script setup lang="ts">
import { useStore } from '@/components/applications/settings/settings.ts'
import { useApplication } from '@/hooks/application.ts'
import { useApplicationStore } from '@/stores/application'

interface ShapeOptions {
	label: string
	value: Application.Shape
}

defineOptions({
	name: 'setting-shape'
})

const store = useApplicationStore()
const { APPLICATION } = useApplication()
const { active, updateActive, updateSetting } = useStore()

const options: ShapeOptions[] = [
	{
		label: '圆形',
		value: 'circle'
	},
	{
		label: '方形',
		value: 'square'
	},
	{
		label: '矩形',
		value: 'rectangle'
	}
]

function unifySetting(application: Application) {
	const unify: Application = {
		...application,
		size: 'mini',
		shape: 'square',
		direction: 'horizontal'
	}
	return unify
}
</script>

<template>
	<div class="setting-shape">
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
				class="shape-radio-group"
				@update:value="updateSetting?.('shape', $event)"
				:value="active?.shape ?? 'square'"
			>
				<a-radio-button
					:key="shape.value"
					:value="shape.value"
					v-for="shape in options"
					:class="['shape-radio', shape.value]"
				>
					{{ shape.label }}
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

.setting-shape {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: row;

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

	.shape-radio-group {
		padding-inline: 20px;
		margin-inline: auto;
		background-color: #fff;
		border-radius: 16px;

		.shape-radio {
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
