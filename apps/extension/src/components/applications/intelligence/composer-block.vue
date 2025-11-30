<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
	name: 'composer-block'
})

const props = withDefaults(
	defineProps<{
		keyword: string
	}>(),
	{}
)

const emit = defineEmits<{
	(e: 'trigger:paste', event: Event): void
	(e: 'trigger:enter', event: KeyboardEvent): void
	(e: 'update:keyword', keyword: string): void
	(e: 'update:DOM', html: string): void
}>()

const isComposing = ref(false)
const composerRef = useTemplateRef<HTMLElement>('composerRef')
const isInternalUpdate = ref(false) // 标记是否是由内部更新触发的

// 保存和恢复光标位置
function saveSelection() {
	const selection = window.getSelection()
	if (!selection || selection.rangeCount === 0) return null
	return selection.getRangeAt(0).cloneRange()
}

function restoreSelection(range: Range | null) {
	if (!range) return
	const selection = window.getSelection()
	if (!selection) return
	selection.removeAllRanges()
	selection.addRange(range)
}

// 同步外部传入的 keyword 到 contenteditable
watch(
	() => props.keyword,
	(value) => {
		const composer = composerRef.value
		if (!composer) return
		if (isInternalUpdate.value) return

		// 保存光标位置
		const savedRange = saveSelection()

		// 判断传入的是 HTML 还是纯文本
		// 如果包含 HTML 标签，则使用 innerHTML，否则使用 textContent
		const isDOM = /<(\w+)[^>]*>(.*?<\/\1>)?/.test(value)
		const innerHTML = composer.innerHTML

		if (isDOM) {
			if (innerHTML !== value) composer.innerHTML = value
		} else {
			if (composer.textContent !== value) {
				composer.textContent = value
			}
		}

		// 恢复光标位置（如果可能）
		if (savedRange) void nextTick(() => restoreSelection(savedRange))
	},
	{
		immediate: true
	}
)

function onUpdateKeyword(event: InputEvent) {
	// 如果在中文输入法组合过程中，不触发更新
	if (isComposing.value) return

	const target = event.target as HTMLElement
	const textContent = target.textContent ?? ''
	const DOMStringified = target.innerHTML ?? ''

	console.log('[onUpdateKeyword] \n\ntext:', textContent, '\n\nDOM:', DOMStringified)

	// 标记为内部更新，避免触发 watch
	isInternalUpdate.value = true

	// 同时传递文本内容和 HTML 内容
	emit('update:keyword', textContent)
	emit('update:DOM', DOMStringified)

	// 在下一个 tick 重置标志
	void nextTick(() => {
		isInternalUpdate.value = false
	})
}

function onCompositionBegin(event: CompositionEvent) {
	console.log('[onCompositionBegin]', event)
	isComposing.value = true
}

function onCompositionUpdate(event: CompositionEvent) {
	console.log('[onCompositionUpdate]', event)
	// 在输入法输入过程中不触发更新，避免频繁触发
}

function onCompositionFinal(event: CompositionEvent) {
	console.log('[onCompositionFinal]', event)
	const target = event.target as HTMLElement
	isComposing.value = false

	// 输入法输入结束后，获取最终内容并触发更新
	const textContent = target.textContent ?? ''
	const DOMStringified = target.innerHTML ?? ''

	// 标记为内部更新，避免触发 watch
	isInternalUpdate.value = true

	emit('update:keyword', textContent)
	emit('update:DOM', DOMStringified)

	// 在下一个 tick 重置标志
	void nextTick(() => (isInternalUpdate.value = false))
}
</script>

<template>
	<div class="composer-block">
		<!-- <div class="composer-operations"></div> -->
		<div class="composer-revise">
			<!-- <a-textarea
				:value="keyword"
				:bordered="false"
				class="composer-field native"
				@paste="$emit('trigger:paste', $event)"
				placeholder="请输入内容，Shift + Enter 换行，Enter 发送"
				@update:value="$emit('update:keyword', $event)"
				@pressEnter="$emit('trigger:enter', $event)"
			></a-textarea> -->
			<div
				ref="composerRef"
				:contenteditable="true"
				@input="onUpdateKeyword"
				@keypress.exact.enter="$emit('trigger:enter', $event)"
				@keypress.shift.enter="$emit('trigger:enter', $event)"
				@compositionstart="onCompositionBegin"
				@compositionupdate="onCompositionUpdate"
				@compositionend="onCompositionFinal"
				class="composer-field mirror"
			></div>
		</div>
		<div class="composer-operations">
			<!-- <div class="operation-begin"></div> -->
			<div class="operation-final">
				<a-button class="upload-mark"> <Icon icon="mdi:paperclip" /> </a-button>
				<a-button class="sender-mark"> <Icon icon="ant-design:send-outlined" /> </a-button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.composer-block {
	$composer-max-height: 200px;

	width: 100%;
	max-height: $composer-max-height;
	padding: 16px;
	border-radius: 10px;
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

	.composer-revise {
		width: 100%;
		height: 100%;
		position: relative;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

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
		overflow: hidden scroll;
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
			outline: none;
			// pointer-events: none;
			// visibility: hidden;
		}
	}
}
</style>
