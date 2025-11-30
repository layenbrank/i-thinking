<script setup lang="ts">
defineOptions({
	name: 'composer-revise'
})

withDefaults(
	defineProps<{
		keyword: string
	}>(),
	{}
)

defineEmits<{
	(e: 'trigger:enter', event: KeyboardEvent): void
	(e: 'update:keyword', keyword: string): void
}>()
</script>

<template>
	<div class="composer-revise">
		<a-textarea
			:value="keyword"
			:bordered="false"
			class="composer-field native"
			placeholder="请输入内容，Shift + Enter 换行，Enter 发送"
			@pressEnter="$emit('trigger:enter', $event)"
			@update:value="$emit('update:keyword', $event)"
		></a-textarea>
		<div class="composer-field mirror">
			{{ keyword }}
		</div>
	</div>
</template>

<style lang="scss" scoped>
.composer-revise {
	width: 100%;
	position: relative;
	border-radius: 24px;
	background-color: #ffffff;
	border: 1px solid rgba(0, 0, 0, 0.1);
	transition:
		opacity 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		border-radius 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		transform 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
		box-shadow 300ms cubic-bezier(0.165, 0.84, 0.44, 1);
	box-shadow:
		0 4px 10px rgba(0, 0, 0, 0.02),
		0 2px 4px rgba(0, 0, 0, 0.04);

	.composer-field {
		width: 100%;
		height: 100%;
		min-height: 65px;
		font-size: 14px;
		line-height: 20px;
		resize: none;
		padding: 8px;
		caret-color: #3964fe;
		word-break: break-word;
		white-space: pre-line;
		overflow-wrap: break-word;
		scroll-behavior: smooth;
		mask: linear-gradient(to bottom, transparent, #fff 3.75%, #fff calc(100% - 3.75%), transparent);

		&.native {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
		}

		&.mirror {
			pointer-events: none;
			visibility: hidden;
		}
	}
}
</style>
