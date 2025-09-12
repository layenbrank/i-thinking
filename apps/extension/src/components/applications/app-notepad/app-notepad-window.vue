<script setup lang="ts">
import { useMarkdownStore } from '@/stores/markdown.ts'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import MarkdownImage from '@tiptap/extension-image'
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list'
import Mention from '@tiptap/extension-mention'
import { TableCell, TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import {
	Editor,
	EditorContent as MarkdownTiptap,
	VueNodeViewRenderer,
	type DocumentType
} from '@tiptap/vue-3'
import CSS from 'highlight.js/lib/languages/css'
import JavaScript from 'highlight.js/lib/languages/javascript'
import TypeScript from 'highlight.js/lib/languages/typescript'
import HTML from 'highlight.js/lib/languages/xml'
import { throttle } from 'lodash-es'
import { all, createLowlight as definelowlight } from 'lowlight'
import { ColorHighlighter, MetadataExtension, SmilieReplacer } from './extension.ts'
import MarkdownCodeBlock from './markdown-code-block.vue'
import MarkdownControl from './markdown-control.vue'
import Suggestion from './markdown-mention.ts'
// import MarkdownBubble from './markdown-bubble.vue'
// import MarkdownFloating from './markdown-floating.vue'
// import Document from '@tiptap/extension-document'

defineOptions({
	name: 'app-notepad-window'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

// const editor = useEditor()

const store = useMarkdownStore()
const editor = shallowRef<Editor>()
const activeKey = ref()

const CustomTableCell = TableCell.extend({
	addAttributes() {
		return {
			// extend the existing attributes …
			...this.parent?.(),

			// and add a new one …
			backgroundColor: {
				default: null,
				parseHTML(element) {
					return element.getAttribute('data-background-color')
				},
				renderHTML(attributes) {
					return {
						'data-background-color': attributes.backgroundColor,
						style: `background-color: ${attributes.backgroundColor}`
					}
				}
			}
		}
	}
})

const CustomTaskItem = TaskItem.extend({
	content: 'inline*'
})

// create a lowlight instance
const lowlight = definelowlight(all)

// you can also register languages
lowlight.register('html', HTML)
lowlight.register('css', CSS)
lowlight.register('js', JavaScript)
lowlight.register('ts', TypeScript)

function logger(label: string, msg: any) {
	console.log(
		`%c ${label} %c`,
		'background-color: #1e90ff; padding: 1px; border-radius: 4px; color: #ffffff; border: 1px solid #1e90ff;',
		msg
	)
}

const unwatch = watch(
	() => store.markdowns,
	function (values) {
		if (values) unwatch.stop()
		if (!values) return
		const [value] = values
		if (!editor.value) return
		if (!value) buildMarkdown()
		else {
			editor.value.commands.setMetadata({
				id: value.id,
				createdAt: value.createdAt,
				updatedAt: value.updatedAt
			})
			editor.value.commands.setContent(value)
			activeKey.value = value.id
		}
	}
)

function buildMarkdown() {
	if (!editor.value) return
	const value: Markdown = {
		content: [],
		type: 'doc',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		id: crypto.randomUUID()
	}
	editor.value.commands.setMetadata({
		id: value.id,
		createdAt: value.createdAt,
		updatedAt: value.updatedAt
	})

	void store.toInsert(value)

	activeKey.value = value.id
}

onMounted(function () {
	editor.value = new Editor({
		content: store.markdowns?.[0] ?? '',
		editorProps: {
			attributes: {
				spellcheck: 'false'
			}
		},
		extensions: [
			StarterKit.configure({
				undoRedo: {
					depth: 100,
					newGroupDelay: 300
				},
				bold: {
					HTMLAttributes: {
						class: 'markdown-bold',
						'data-type': 'bold'
					}
				},
				code: {
					HTMLAttributes: {
						class: 'markdown-code',
						'data-type': 'code'
					}
				},
				codeBlock: false,
				italic: {
					HTMLAttributes: {
						class: 'markdown-italic',
						'data-type': 'italic'
					}
				},
				link: {
					openOnClick: false,
					HTMLAttributes: {
						class: 'markdown-link',
						'data-type': 'link'
					}
				},
				dropcursor: {
					color: 'var(--blue-6)',
					width: 3,
					class: 'markdown-dropcursor'
				},
				strike: {
					HTMLAttributes: {
						class: 'markdown-strike',
						'data-type': 'strike'
					}
				},
				paragraph: {
					HTMLAttributes: {
						class: 'markdown-paragraph',
						'data-type': 'paragraph'
					}
				},
				heading: {
					HTMLAttributes: {
						class: 'markdown-heading',
						'data-type': 'heading'
					},
					levels: [1, 2, 3, 4, 5, 6]
				}
			}),
			Mention.configure({
				HTMLAttributes: {
					class: 'markdown-mention',
					'data-type': 'mention'
				},
				suggestion: Suggestion
			}),
			Highlight.extend({
				addOptions() {
					return {
						...this.parent?.(),
						multicolor: true,
						HTMLAttributes: {
							class: 'markdown-highlight',
							'data-type': 'highlight'
						}
					}
				}
			}),
			CodeBlockLowlight.extend({
				addNodeView() {
					return VueNodeViewRenderer(MarkdownCodeBlock)
				}
			}).configure({
				lowlight,
				HTMLAttributes: {
					class: 'markdown-code-block',
					'data-type': 'code-block'
				},
				defaultLanguage: 'javascript',
				languageClassPrefix: 'language-'
			}),
			Color.configure({
				types: [TextStyle.name, ListItem.name]
			}),
			TextStyle.configure({
				mergeNestedSpanStyles: true,
				HTMLAttributes: {
					class: 'markdown-text-style',
					'data-type': 'text-style'
				}
			}),
			TableKit.configure({
				table: {
					resizable: true
				},
				tableCell: false
			}),
			TextAlign.configure({
				types: ['heading', 'paragraph']
			}),
			MetadataExtension,
			TaskList,
			Typography,
			MarkdownImage,
			CustomTaskItem,
			CustomTableCell,
			ColorHighlighter,
			SmilieReplacer
		],
		onCreate() {
			// if (!props.editor.storage.metadata.id) {
			// 	props.editor.commands.setMetadata({
			// 		id: crypto.randomUUID(),
			// 		createdAt: Date.now(),
			// 		updatedAt: Date.now()
			// 	})
			// }
		},
		onUpdate() {
			void throttleUpdate()
		}
	})
})

const throttleUpdate = throttle(function () {
	if (!editor.value) return

	// 获取文档内容
	const content = editor.value.getJSON()

	// 获取存储的元数据
	const metadata = editor.value.storage.metadata

	const value = {
		...content,
		id: metadata.id,
		createdAt: metadata.createdAt,
		updatedAt: metadata.updatedAt
	} as Markdown

	if (value.id) return store.toUpdate(value)
	else {
		// 创建新文档时设置元数据
		editor.value.commands.setMetadata({
			id: crypto.randomUUID(),
			createdAt: Date.now(),
			updatedAt: Date.now()
		})

		// 重新获取更新后的数据
		const content = editor.value.getJSON()
		const metadata = editor.value.storage.metadata
		const value: Markdown = {
			...content,
			id: metadata.id,
			createdAt: metadata.createdAt,
			updatedAt: metadata.updatedAt
		}

		void store.toInsert(value)
	}
}, 3000)

// const throttle = (func: Function, limit: number) => {
// 	let inThrottle: boolean
// 	return function (this: any) {
// 		const args = arguments
// 		// eslint-disable-next-line @typescript-eslint/no-this-alias
// 		const context = this
// 		if (!inThrottle) {
// 			func.apply(context, args)
// 			inThrottle = true
// 			setTimeout(() => (inThrottle = false), limit)
// 		}
// 	}
// }

function findTitle(value: DocumentType): string {
	if (!value) return '新建文档'

	for (const item of value.content) {
		if (item.type !== 'heading') continue
		if (!item.content) continue
		const [title] = item.content
		if (title) return title.text
		else return findTitle(item as DocumentType)
	}

	return '新建文档'
}

onBeforeUnmount(function () {
	if (!editor.value) return
	editor.value.destroy()
	void throttleUpdate()
})
</script>

<template>
	<div class="app-notepad-window">
		<a-tabs tab-position="left" v-model:activeKey="activeKey" class="markdown-tabs">
			<a-tab-pane
				v-for="value in store.markdowns"
				:key="value.id"
				:tab="findTitle(value as unknown as DocumentType)"
			>
				<template #default>
					<template v-if="activeKey === value.id">
						<markdown-control :editor="editor" v-if="editor" />
						<markdown-tiptap :editor="editor" v-if="editor" class="markdown-tiptap" />
					</template>
				</template>
			</a-tab-pane>
			<template #renderTabBar="{ DefaultTabBar, ...props }">
				<component :is="DefaultTabBar" v-bind="props" :style="{ opacity: 0.5 }" />
			</template>
		</a-tabs>
		<a-button type="dashed" @click="buildMarkdown" class="insert-button">
			<i-ant-design:plus-outlined />
		</a-button>
	</div>
</template>

<style lang="scss" scoped>
@use 'markdown.scss' as *;

.app-notepad-window {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	// flex-direction: column;

	$markdown-w: 200px;

	.insert-button {
		position: absolute;
		bottom: 16px;
		transform: translateX(-100%);
		left: $markdown-w - 16px;
	}

	.markdown-tiptap {
		* {
			outline: 0;
		}
	}

	.markdown-tabs {
		width: 100%;
		height: 100%;
		// flex: 1;
	}

	:deep(.ant-tabs-nav) {
		flex: none;
		width: 200px;
	}

	:deep(.ant-tabs-content-holder) {
		width: calc(100% - $markdown-w - 1px);
		flex: none;

		.ant-tabs-content {
			height: 100%;
		}

		.ant-tabs-tabpane {
			height: 100%;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
		}
	}
}
</style>
