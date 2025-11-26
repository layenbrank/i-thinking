<script setup lang="ts">
import { injectStore } from '@/components/applications/collection/collection.ts'
import { useApplication } from '@/hooks/application.ts'

defineOptions({
	name: 'collection-overlay'
})

const { navigations } = injectStore()
const { APPLICATION } = useApplication()
</script>

<template>
	<div class="collection-overlay">
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

	.controller {
		@extend %controller;
	}
}
</style>
