<script setup lang="ts">
import { useApplication } from '@/hooks/application.ts'
import { useApplicationStore } from '@/stores/application.ts'

interface DirectionOptions {
	label: string
	value: Application.Direction
}

defineOptions({
	name: 'setting-direction'
})

const store = useApplicationStore()
const { APPLICATION } = useApplication()

const options: DirectionOptions[] = [
	{
		label: '水平方向',
		value: 'horizontal'
	},
	{
		label: '垂直方向',
		value: 'vertical'
	}
]

const active = ref<Application | null>(null)

function updateActive(event: MouseEvent) {
	const target = event.target as HTMLElement

	const closest = target.closest<HTMLElement>('.application')
	if (!closest) return

	const id = closest.dataset.id
	if (!id) return

	const application = store.applications?.find(function (value) {
		return value.id === id
	})
	if (!application) return
	active.value = application
}

function updateDirection(value: Application.Direction) {
	if (!active.value) return
	active.value.direction = value
	void store.toUpdate(active.value.id, { direction: value })
}

function unifySetting(application: Application) {
	const unify: Application = {
		...application,
		size: 'mini',
		shape: 'square',
		direction: 'horizontal'
	}
	return unify
}

onMounted(function () {
	if (!store.applications) return
	const [application] = store.applications
	if (!application) return
	if (active.value) return
	active.value = application
})
</script>

<template>
	<div class="setting-direction">
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
				class="direction-radio-group"
				@update:value="updateDirection"
				:value="active?.direction ?? 'horizontal'"
			>
				<a-radio-button
					:key="direction.value"
					:value="direction.value"
					v-for="direction in options"
					:class="['direction-radio', direction.value]"
				>
					{{ direction.label }}
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

.setting-direction {
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

	.direction-radio-group {
		padding-inline: 20px;
		margin-inline: auto;
		background-color: #fff;
		border-radius: 16px;

		.direction-radio {
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
