<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { FloatingMenu } from '@tiptap/vue-3/menus'

defineOptions({
	name: 'markdown-floating'
})

withDefaults(
	defineProps<{
		editor: Editor
	}>(),
	{}
)
</script>

<template>
	<floating-menu :editor="editor" v-if="editor">
		<div class="markdown-floating">
			<button
				@click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
				:class="[
					'floating-button',
					{
						'is-active': editor?.isActive('heading', { level: 1 })
					}
				]"
			>
				H1
			</button>
			<button
				@click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
				:class="[
					'floating-button',
					{
						'is-active': editor?.isActive('heading', { level: 2 })
					}
				]"
			>
				H2
			</button>
			<button
				@click="editor?.chain().focus().toggleBulletList().run()"
				:class="[
					'floating-button',
					{
						'is-active': editor?.isActive('bulletList')
					}
				]"
			>
				Bullet list
			</button>
			<button
				@click="editor?.chain().focus().toggleBold().run()"
				:class="[
					'floating-button',
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
					'floating-button',
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
					'floating-button',
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
				:class="['floating-button']"
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
				:class="['floating-button']"
			>
				Insert HTML table
			</button>
			<button
				@click="editor?.chain().focus().addColumnBefore().run()"
				:disabled="!editor?.can().addColumnBefore()"
				:class="['floating-button']"
			>
				Add column before
			</button>
			<button
				@click="editor?.chain().focus().addColumnAfter().run()"
				:disabled="!editor?.can().addColumnAfter()"
				:class="['floating-button']"
			>
				Add column after
			</button>
			<button
				@click="editor?.chain().focus().deleteColumn().run()"
				:disabled="!editor?.can().deleteColumn()"
				:class="['floating-button']"
			>
				Delete column
			</button>
			<button
				@click="editor?.chain().focus().addRowBefore().run()"
				:disabled="!editor?.can().addRowBefore()"
				:class="['floating-button']"
			>
				Add row before
			</button>
			<button
				@click="editor?.chain().focus().addRowAfter().run()"
				:disabled="!editor?.can().addRowAfter()"
				:class="['floating-button']"
			>
				Add row after
			</button>
			<button
				@click="editor?.chain().focus().deleteRow().run()"
				:disabled="!editor?.can().deleteRow()"
				:class="['floating-button']"
			>
				Delete row
			</button>
			<button
				@click="editor?.chain().focus().deleteTable().run()"
				:disabled="!editor?.can().deleteTable()"
				:class="['floating-button']"
			>
				Delete table
			</button>
			<button
				@click="editor?.chain().focus().mergeCells().run()"
				:disabled="!editor?.can().mergeCells()"
				:class="['floating-button']"
			>
				Merge cells
			</button>
			<button
				@click="editor?.chain().focus().splitCell().run()"
				:disabled="!editor?.can().splitCell()"
				:class="['floating-button']"
			>
				Split cell
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderColumn().run()"
				:disabled="!editor?.can().toggleHeaderColumn()"
				:class="['floating-button']"
			>
				Toggle header column
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderRow().run()"
				:disabled="!editor?.can().toggleHeaderRow()"
				:class="['floating-button']"
			>
				Toggle header row
			</button>
			<button
				@click="editor?.chain().focus().toggleHeaderCell().run()"
				:disabled="!editor?.can().toggleHeaderCell()"
				:class="['floating-button']"
			>
				Toggle header cell
			</button>
			<button
				@click="editor?.chain().focus().mergeOrSplit().run()"
				:disabled="!editor?.can().mergeOrSplit()"
				:class="['floating-button']"
			>
				Merge or split
			</button>
			<button
				@click="editor?.chain().focus().setCellAttribute('backgroundColor', '#FAF594').run()"
				:disabled="!editor?.can().setCellAttribute('backgroundColor', '#FAF594')"
				:class="['floating-button']"
			>
				Set cell attribute
			</button>
			<button
				@click="editor?.chain().focus().fixTables().run()"
				:disabled="!editor?.can().fixTables()"
				:class="['floating-button']"
			>
				Fix tables
			</button>
			<button
				@click="editor?.chain().focus().goToNextCell().run()"
				:disabled="!editor?.can().goToNextCell()"
				:class="['floating-button']"
			>
				Go to next cell
			</button>
			<button
				@click="editor?.chain().focus().goToPreviousCell().run()"
				:disabled="!editor?.can().goToPreviousCell()"
				:class="['floating-button']"
			>
				Go to previous cell
			</button>
		</div>
	</floating-menu>
</template>

<style lang="scss" scoped>
/* Floating menu */
.markdown-floating {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--gray-3);
	padding: 0.1rem;
	border-radius: 0.5rem;

	.floating-button {
		background-color: unset;
		padding: 0.275rem 0.425rem;
		border-radius: 0.3rem;

		&:hover {
			background-color: var(--gray-3);
		}

		&.is-active {
			background-color: var(--white);
			color: var(--purple);

			&:hover {
				color: var(--purple-contrast);
			}
		}
	}
}
</style>
