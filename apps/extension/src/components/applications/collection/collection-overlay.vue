<script setup lang="ts">
import { injectStore } from '@/components/applications/collection/collection.ts'
import { useMirror } from '@/hooks/mirror'
import { useMirrorStore } from '@/stores/mirror.ts'
import { message } from 'ant-design-vue'

defineOptions({
	name: 'collection-overlay'
})

const props = withDefaults(
	defineProps<{
		id: string
		name: string
	}>(),
	{}
)

const mirrorStore = useMirrorStore()
const { navigations } = injectStore()
const { APPLICATION } = useMirror()
const updateRef = useTemplateRef('updateRef')

const value = ref<string>(props.name)

function handleEnter() {
	const trimmed = value.value.trim()
	if (!trimmed) return message.warning('集合名称不能为空')
	try {
		void mirrorStore.toUpdateApplication([
			{
				key: props.id,
				changes: {
					name: trimmed
				}
			}
		])

		message.success('集合名称更新成功')
	} catch {
		message.error('更新集合名称失败')
	} finally {
		updateRef.value?.$el.blur()
	}
}
</script>

<template>
	<div class="collection-overlay">
		<a-input
			ref="updateRef"
			v-model:value="value"
			@pressEnter="handleEnter"
			class="collection-update"
		></a-input>
		<TransitionGroup tag="div" name="application-fade" class="controller">
			<template v-for="application in navigations" :key="application.id">
				<component
					:class="['application']"
					:settings-visible="false"
					:data-id="application.id"
					:application="application"
					:is="APPLICATION[application.component]"
				/>
			</template>
		</TransitionGroup>
	</div>
</template>

<style lang="scss" scoped>
@use '@/styles/application.scss' as *;

.collection-overlay {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-block: 20px;

	.collection-update {
		width: 300px;
		border-radius: 30px;
	}

	.controller {
		width: 100%;
		@extend %controller;
	}
}
</style>
