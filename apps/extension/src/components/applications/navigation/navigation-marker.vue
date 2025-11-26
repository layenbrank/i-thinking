<script setup lang="ts">
import fallback from '@/assets/feedback/fallback.png'
import { useMirrorStore } from '@/stores/mirror.ts'
import { useDropZone } from '@vueuse/core'

defineOptions({
	name: 'navigation-marker'
})

const props = withDefaults(
	defineProps<{
		id: string
		name: string
		marker?: string
	}>(),
	{}
)

const mirrorStore = useMirrorStore()

const dropZoneRef = useTemplateRef<HTMLElement>('dropZoneRef')

const { isOverDropZone } = useDropZone(dropZoneRef, {
	dataTypes: ['text/plain'],
	onDrop(files, event) {
		const targetID = props.id
		const sourceID = event.dataTransfer?.getData('text/plain')

		if (!sourceID) return
		if (sourceID === targetID) return

		void mirrorStore.toReadApplication([sourceID]).then(function (values) {
			const applications = values.filter(Boolean)
			if (!applications.length) return

			const [application] = applications
			if (!application) return

			const isNavigation = application.component === 'navigation'
			if (isNavigation) void handleNavigation(sourceID, targetID)
		})
	}
})

async function handleNavigation(sourceID: string, targetID: string) {
	if (!mirrorStore.mirrorID) return
	const genericID = crypto.randomUUID()

	await mirrorStore.toInsertApplication([
		{
			id: genericID,
			name: '未命名集合',
			size: 'mini',
			shape: 'rectangle',
			index: mirrorStore.applications?.length ?? 0,
			round: '8px',
			width: null,
			marker: '',
			height: null,
			mirrorID: mirrorStore.mirrorID,
			textSize: '16px',
			textColor: '#ffffff',
			direction: 'horizontal',
			component: 'collection',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			description: '',
			downloadCount: 0,
			backgroundColor: '#ffffff',
			backgroundImage: null
		}
	])

	await mirrorStore.toUpdateApplication([
		{
			key: sourceID,
			changes: {
				collectionID: genericID
			}
		},
		{
			key: targetID,
			changes: {
				collectionID: genericID
			}
		}
	])
}

// 没有图标截取应用名称的第一个字作为标记
const char = computed(() => {
	return props.name ? props.name.charAt(0) : ''
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
		<template v-if="!marker && char">
			{{ char }}
		</template>
		<a-image
			v-else-if="marker || !char"
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
