<script setup lang="ts">
import fallback from '@/assets/feedback/fallback.png'
import { useApplicationStore } from '@/stores/application.ts'
import { useDropZone } from '@vueuse/core'

defineOptions({
	name: 'navigation-marker'
})

const props = withDefaults(
	defineProps<{
		id: string
		marker?: string
	}>(),
	{}
)

const applicationStore = useApplicationStore()

const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')

const { isOverDropZone } = useDropZone(dropZoneRef, {
	dataTypes: ['text/plain'],
	onDrop(files, event) {
		const ID = event.dataTransfer?.getData('text/plain')
		if (!ID) return
		if (ID === props.id) return
		// applicationStore.toInsert( {
		// 'component': 'collection',

		// })
		// console.log('Dropped files:', files)
		// console.log('Drop event:', event, 'dataTransfer:', event.dataTransfer?.getData('text/plain'))
	}
})

onMounted(function () {
	//
})
</script>

<template>
	<div
		ref="dropZoneRef"
		class="navigation-marker"
		:class="{
			isOverDropZone: isOverDropZone
		}"
	>
		<a-image
			:preview="false"
			:fallback="fallback"
			:src="marker"
			wrapper-class-name="navigation-image"
		>
			<template #placeholder>
				<a-skeleton-image active class="navigation-placeholder" />
			</template>
		</a-image>
	</div>
</template>

<style lang="scss" scoped>
@use 'mini.scss' as *;
@use 'small.scss' as *;
@use 'medium.scss' as *;
@use 'large.scss' as *;
@use 'huge.scss' as *;
@use 'massive.scss' as *;
@use 'ultra.scss' as *;

.navigation-marker {
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: var(--application-round);
	background: var(--application-background);
	transition: box-shadow 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

	%size-full {
		width: 100%;
		height: 100%;
	}

	&.isOverDropZone {
		box-shadow: 0px 0px 1px 3px #4080ff;
	}

	&.circle {
		border-radius: calc(var(--application-size-width) / 2);
	}

	:deep(.navigation-image),
	:deep(.ant-image-placeholder),
	:deep(.navigation-placeholder),
	:deep(.ant-skeleton-image) {
		@extend %size-full;
	}

	:deep(.navigation-image) {
		border-radius: var(--application-round);
	}

	:deep(.navigation-placeholder) {
		display: block;

		.ant-skeleton-image {
		}
	}
}
</style>
