import { mergeAttributes, Node, VueNodeViewRenderer } from '@tiptap/vue-3'

const MarkdownDrawing = defineAsyncComponent(function () {
	return import('./markdown-drawing.vue')
})

export default Node.create({
	name: 'markdown-drawing',
	group: 'block',
	atom: true,
	addAttributes() {
		return {
			lines: {
				default: []
			}
		}
	},
	parseHTML() {
		return [
			{
				tag: 'div[data-type="markdown-drawing"]'
			}
		]
	},
	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'drawing' })]
	},
	addNodeView() {
		return VueNodeViewRenderer(MarkdownDrawing)
	}
})
