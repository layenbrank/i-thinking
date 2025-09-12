<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

defineOptions({
	name: 'markdown-control'
})

const props = withDefaults(
	defineProps<{
		editor: Editor
	}>(),
	{}
)

interface Configure {
	text: string
	className: string
	active: boolean
	command: () => void
	disabled: boolean
}

const configurations = reactive<Configure[]>([
	{
		text: 'Bold',
		className: 'button-control',
		active: props.editor.isActive('bold'),
		command() {
			return props.editor.chain().focus().toggleBold().run()
		},
		disabled: !props.editor.can().chain().focus().toggleBold().run()
	},
	{
		text: 'Italic',
		className: 'button-control',
		active: props.editor.isActive('italic'),
		command() {
			return props.editor.chain().focus().toggleItalic().run()
		},
		disabled: !props.editor.can().chain().focus().toggleItalic().run()
	},
	{
		text: 'Strike',
		className: 'button-control',
		active: props.editor.isActive('strike'),
		command() {
			return props.editor.chain().focus().toggleStrike().run()
		},
		disabled: !props.editor.can().chain().focus().toggleStrike().run()
	},
	{
		text: 'Code',
		className: 'button-control',
		active: props.editor.isActive('code'),
		command() {
			return props.editor.chain().focus().toggleCode().run()
		},
		disabled: !props.editor.can().chain().focus().toggleCode().run()
	},
	{
		text: 'Clear marks',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().unsetAllMarks().run()
		},
		disabled: false
	},
	{
		text: 'Clear nodes',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().clearNodes().run()
		},
		disabled: false
	},
	{
		text: 'Paragraph',
		className: 'button-control',
		active: props.editor.isActive('paragraph'),
		command() {
			return props.editor.chain().focus().setParagraph().run()
		},
		disabled: false
	},
	{
		text: 'H1',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 1 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 1 }).run()
		},
		disabled: false
	},
	{
		text: 'H2',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 2 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 2 }).run()
		},
		disabled: false
	},
	{
		text: 'H3',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 3 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 3 }).run()
		},
		disabled: false
	},
	{
		text: 'H4',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 4 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 4 }).run()
		},
		disabled: false
	},
	{
		text: 'H5',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 5 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 5 }).run()
		},
		disabled: false
	},
	{
		text: 'H6',
		className: 'button-control',
		active: props.editor.isActive('heading', { level: 6 }),
		command() {
			return props.editor.chain().focus().toggleHeading({ level: 6 }).run()
		},
		disabled: false
	},
	{
		text: 'Bullet list',
		className: 'button-control',
		active: props.editor.isActive('bulletList'),
		command() {
			return props.editor.chain().focus().toggleBulletList().run()
		},
		disabled: false
	},
	{
		text: 'Ordered list',
		className: 'button-control',
		active: props.editor.isActive('orderedList'),
		command() {
			return props.editor.chain().focus().toggleOrderedList().run()
		},
		disabled: false
	},
	{
		text: 'Code block',
		className: 'button-control',
		active: props.editor.isActive('codeBlock'),
		command() {
			return props.editor.chain().focus().toggleCodeBlock().run()
		},
		disabled: false
	},
	{
		text: 'Blockquote',
		className: 'button-control',
		active: props.editor.isActive('blockquote'),
		command() {
			return props.editor.chain().focus().toggleBlockquote().run()
		},
		disabled: false
	},
	{
		text: 'Horizontal rule',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().setHorizontalRule().run()
		},
		disabled: false
	},
	{
		text: 'Hard break',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().setHardBreak().run()
		},
		disabled: false
	},
	{
		text: 'Undo',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().undo().run()
		},
		disabled: false
	},
	{
		text: 'Redo',
		className: 'button-control',
		active: false,
		command() {
			return props.editor.chain().focus().redo().run()
		},
		disabled: false
	},
	{
		text: 'Purple',
		className: 'button-control',
		active: props.editor.isActive('textStyle', {
			color: '#958DF1'
		}),
		command() {
			return props.editor.chain().focus().setColor('#958DF1').run()
		},
		disabled: false
	},
	{
		text: 'Export',
		className: 'button-control',
		active: false,
		command() {
			const json = props.editor.getJSON()
			console.log('json', json)
			const blob = new Blob([JSON.stringify(json, null, 2)], {
				type: 'application/json'
			})
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'markdown.json'
			a.click()
			URL.revokeObjectURL(url)
			return json
		},
		disabled: false
	}
])
</script>

<template>
	<div class="markdown-control">
		<template v-for="configuration in configurations" :key="configuration.text">
			<a-button
				type="dashed"
				@click="configuration.command()"
				:disabled="configuration.disabled"
				:class="[
					configuration.className,
					{
						'is-active': configuration.active
					}
				]"
			>
				{{ configuration.text }}
			</a-button>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.markdown-control {
	width: 100%;
	display: grid;
	grid-template-rows: repeat(auto-fit, minmax(32px, 1fr));
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 8px;

	.button-control {
		width: 100%;
		height: 100%;
	}
}
</style>
