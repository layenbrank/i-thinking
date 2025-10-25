<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'

defineOptions({
	name: 'markdown-bubble'
})

withDefaults(
	defineProps<{
		editor: Editor
	}>(),
	{}
)
</script>

<template>
	<bubble-menu :editor="editor" v-if="editor">
		<div class="markdown-bubble">
			<button
				@click="editor?.chain().focus().toggleBold().run()"
				:class="[
					'bubble-button',
					{
						'is-active': editor?.isActive('bold')
					}
				]"
			>
				Bold
			</button>
			<button
				@click="editor?.chain().focus().toggleItalic().run()"
				:class="[
					'bubble-button',
					{
						'is-active': editor?.isActive('italic')
					}
				]"
			>
				Italic
			</button>
			<button
				@click="editor?.chain().focus().toggleStrike().run()"
				:class="[
					'bubble-button',
					{
						'is-active': editor?.isActive('strike')
					}
				]"
			>
				Strike
			</button>
			<button
				@click="
					editor
						?.chain()
						.focus()
						.insertTable({
							rows: 3,
							cols: 3,
							withHeaderRow: true
						})
						.run()
				"
				:class="['bubble-button']"
			>
				Insert table
			</button>
			<button
				@click="
					editor
						?.chain()
						.focus()
						.insertContent('tableHTML', {
							parseOptions: {
								preserveWhitespace: false
							}
						})
						.run()
				"
				:class="['bubble-button']"
			>
				Insert HTML table
			</button>
			<!-- <button
				@click="editor?.chain().focus().addColumnBefore().run()"
				:disabled="!editor?.can().addColumnBefore()"
				:class="['bubble-button']"
			>
				Add column before
			</button>
			<button
				@click="editor?.chain().focus().addColumnAfter().run()"
				:disabled="!editor?.can().addColumnAfter()"
				:class="['bubble-button']"
			>
				Add column after
			</button>
			<button
				@click="editor?.chain().focus().deleteColumn().run()"
				:disabled="!editor?.can().deleteColumn()"
				:class="['bubble-button']"
			>
				Delete column
			</button>
			<button
				@click="editor?.chain().focus().addRowBefore().run()"
				:disabled="!editor?.can().addRowBefore()"
				:class="['bubble-button']"
			>
				Add row before
			</button>
			<button
				@click="editor?.chain().focus().addRowAfter().run()"
				:disabled="!editor?.can().addRowAfter()"
				:class="['bubble-button']"
			>
				Add row after
			</button>
			<button
				@click="editor?.chain().focus().deleteRow().run()"
				:disabled="!editor?.can().deleteRow()"
				:class="['bubble-button']"
			>
				Delete row
			</button>
			<button
				@click="editor?.chain().focus().deleteTable().run()"
				:disabled="!editor?.can().deleteTable()"
				:class="['bubble-button']"
			>
				Delete table
			</button>
			<button
				@click="editor?.chain().focus().mergeCells().run()"
				:disabled="!editor?.can().mergeCells()"
				:class="['bubble-button']"
			>
				Merge cells
			</button>
			<button
				@click="editor?.chain().focus().splitCell().run()"
				:disabled="!editor?.can().splitCell()"
				:class="['bubble-button']"
			>
				Split cell
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderColumn().run()"
				:disabled="!editor?.can().toggleHeaderColumn()"
				:class="['bubble-button']"
			>
				Toggle header column
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderRow().run()"
				:disabled="!editor?.can().toggleHeaderRow()"
				:class="['bubble-button']"
			>
				Toggle header row
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderCell().run()"
				:disabled="!editor?.can().toggleHeaderCell()"
				:class="['bubble-button']"
			>
				Toggle header cell
			</button>
			<button
				@click="editor?.chain().focus().mergeOrSplit().run()"
				:disabled="!editor?.can().mergeOrSplit()"
				:class="['bubble-button']"
			>
				Merge or split
			</button>
			<button
				@click="editor?.chain().focus().setCellAttribute('backgroundColor', '#FAF594').run()"
				:disabled="!editor?.can().setCellAttribute('backgroundColor', '#FAF594')"
				:class="['bubble-button']"
			>
				Set cell attribute
			</button>
			<button
				@click="editor?.chain().focus().fixTables().run()"
				:disabled="!editor?.can().fixTables()"
				:class="['bubble-button']"
			>
				Fix tables
			</button>
			<button
				@click="editor?.chain().focus().goToNextCell().run()"
				:disabled="!editor?.can().goToNextCell()"
				:class="['bubble-button']"
			>
				Go to next cell
			</button>
			<button
				@click="editor?.chain().focus().goToPreviousCell().run()"
				:disabled="!editor?.can().goToPreviousCell()"
				:class="['bubble-button']"
			>
				Go to previous cell
			</button> -->
		</div>
	</bubble-menu>
</template>

<style lang="scss" scoped>
/* Bubble menu */
.markdown-bubble {
	background-color: var(--white);
	border: 1px solid var(--gray-1);
	border-radius: 0.7rem;
	box-shadow: var(--shadow);
	display: flex;
	align-items: center;
	justify-content: center;
	column-gap: 10px;
	padding: 0.2rem;

	.bubble-button {
		cursor: pointer;
		border-radius: 3px;
		background-color: unset;

		&:hover {
			background-color: var(--gray-3);
		}

		&.is-active {
			background-color: var(--purple);

			&:hover {
				background-color: var(--purple-contrast);
			}
		}
	}
}
</style>
