<script setup lang="tsx">
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
	computed,
	defineComponent,
	inject,
	provide,
	useSlots,
	type PropType,
	type Slots,
	type VNode,
	type VNodeArrayChildren
} from 'vue'
import DemoCodeBlock from './demo-code-block.vue'

// ===== Local token types to avoid `any` =====
interface BaseToken {
	type: string
	raw?: string
}
interface SpaceToken extends BaseToken {
	type: 'space'
}
interface ThematicBreakToken extends BaseToken {
	type: 'thematicBreak'
}
interface HeadingToken extends BaseToken {
	type: 'heading'
	depth: number
	text: string
}
interface ParagraphToken extends BaseToken {
	type: 'paragraph'
	text: string
}
interface TextToken extends BaseToken {
	type: 'text'
	text?: string
}
interface BlockquoteToken extends BaseToken {
	type: 'blockquote'
	tokens?: MarkdownToken[]
}
interface ListItem {
	tokens?: MarkdownToken[]
	text?: string
	raw?: string
}
interface ListToken extends BaseToken {
	type: 'list'
	ordered?: boolean
	items?: ListItem[]
}
interface CodeToken extends BaseToken {
	type: 'code'
	text: string
	lang?: string | null
}
interface TableCell {
	text?: string
}
interface TableToken extends BaseToken {
	type: 'table'
	header?: TableCell[]
	rows?: TableCell[][]
}
interface HtmlToken extends BaseToken {
	type: 'html'
	text?: string
}
type MarkdownToken =
	| SpaceToken
	| ThematicBreakToken
	| HeadingToken
	| ParagraphToken
	| TextToken
	| BlockquoteToken
	| ListToken
	| CodeToken
	| TableToken
	| HtmlToken

const props = withDefaults(
	defineProps<{
		source: string
		gfm?: boolean
		breaks?: boolean
	}>(),
	{
		gfm: true,
		breaks: true
	}
)

const emit = defineEmits<{
	(e: 'preview', payload: { code: string; lang?: string | null }): void
	(e: 'copy', payload: { code: string; lang?: string | null; success: boolean }): void
	(e: 'toggle', payload: { expanded: boolean }): void
}>()

// 解析 tokens
const tokens = computed<MarkdownToken[]>(
	() =>
		marked.lexer(props.source, {
			gfm: props.gfm,
			breaks: props.breaks
		}) as unknown as MarkdownToken[]
)

// 安全的行内 HTML 渲染
function inlineHTML(text: string) {
	const html = marked.parseInline(text, { async: false })
	return DOMPurify.sanitize(html)
}

// 透传插槽/事件
const slots = useSlots()
provide('mdr-slots', slots)
provide('mdr-emit', emit)

const TokenRenderer = defineComponent({
	name: 'TokenRenderer',
	props: {
		token: { type: Object as PropType<MarkdownToken>, required: true }
	},
	setup(p) {
		const parentSlots = inject<Slots>('mdr-slots')
		interface EmitPreviewPayload {
			code: string
			lang?: string | null
		}
		interface EmitCopyPayload {
			code: string
			lang?: string | null
			success: boolean
		}
		interface EmitTogglePayload {
			expanded: boolean
		}
		type ParentEmit = ((e: 'preview', payload: EmitPreviewPayload) => void) &
			((e: 'copy', payload: EmitCopyPayload) => void) &
			((e: 'toggle', payload: EmitTogglePayload) => void)
		const parentEmit = inject<ParentEmit>('mdr-emit')

		function renderChildren(innerTokens: MarkdownToken[]): VNodeArrayChildren {
			return innerTokens?.map((t, i) => <TokenRenderer token={t} key={i} />) ?? []
		}

		const handlers: Partial<Record<MarkdownToken['type'], (t: MarkdownToken) => VNode | null>> = {
			space: () => null,
			thematicBreak: () => <hr />,
			heading: (t) => {
				const ht = t as HeadingToken
				const Tag = `h${ht.depth}` as unknown as any
				return <Tag innerHTML={inlineHTML(ht.text)} />
			},
			paragraph: (t) => <p innerHTML={inlineHTML((t as ParagraphToken).text)} />,
			text: (t) => {
				const tt = t as TextToken | BaseToken
				return <span innerHTML={inlineHTML((tt as TextToken).text ?? tt.raw ?? '')} />
			},
			blockquote: (t) => (
				<blockquote>{renderChildren((t as BlockquoteToken).tokens ?? [])}</blockquote>
			),
			list: (t) => {
				const lt = t as ListToken
				const Tag = (lt.ordered ? 'ol' : 'ul') as any
				const children = (lt.items ?? []).map((it: ListItem, idx: number) =>
					it?.tokens?.length ? (
						<li key={idx}>{renderChildren(it.tokens as MarkdownToken[])}</li>
					) : (
						<li key={idx} innerHTML={inlineHTML(it?.text ?? it?.raw ?? '')} />
					)
				)
				return <Tag>{children}</Tag>
			},
			code: (t) => {
				const ct = t as CodeToken
				type GenericSlotFn = (slotProps?: Record<string, unknown>) => VNodeArrayChildren
				const slotsObj: Partial<Record<'toolbar' | 'footer', GenericSlotFn>> = {}
				if (parentSlots?.['code-toolbar'])
					slotsObj.toolbar = (slotProps) =>
						(parentSlots['code-toolbar']?.(slotProps) ?? []) as unknown as VNodeArrayChildren
				if (parentSlots?.['code-footer'])
					slotsObj.footer = (slotProps) =>
						(parentSlots['code-footer']?.(slotProps) ?? []) as unknown as VNodeArrayChildren

				return (
					<DemoCodeBlock
						code={ct.text}
						lang={ct.lang}
						onPreview={(payload: { code: string; lang?: string | null }) =>
							parentEmit?.('preview', payload)
						}
						onCopy={(payload: { code: string; lang?: string | null; success: boolean }) =>
							parentEmit?.('copy', payload)
						}
						onToggle={(payload: { expanded: boolean }) => parentEmit?.('toggle', payload)}
						v-slots={slotsObj}
					/>
				)
			},
			table: (t) => {
				const tt = t as TableToken
				const theadEl = (
					<thead>
						<tr>
							{(tt.header ?? []).map((cell: TableCell, i: number) => (
								<th key={i} innerHTML={inlineHTML(cell.text ?? '')} />
							))}
						</tr>
					</thead>
				)
				const tbodyEl = (
					<tbody>
						{(tt.rows ?? []).map((row: TableCell[], ri: number) => (
							<tr key={ri}>
								{row.map((cell: TableCell, ci: number) => (
									<td key={ci} innerHTML={inlineHTML(cell.text ?? '')} />
								))}
							</tr>
						))}
					</tbody>
				)
				return <table>{[theadEl, tbodyEl]}</table>
			},
			html: (t) => <div innerHTML={DOMPurify.sanitize((t as HtmlToken).text ?? '')} />
		}

		return () => {
			const t = p.token as MarkdownToken
			const handler = handlers[t.type]
			return handler ? handler(t) : t.raw ? <span innerHTML={inlineHTML(t.raw)} /> : null
		}
	}
})
</script>

<template>
	<div class="demo-markdown-renderer">
		<component :is="TokenRenderer" v-for="(t, i) in tokens" :token="t" :key="i" />
	</div>
</template>

<style lang="scss" scoped>
.demo-markdown-renderer {
	width: 100%;
}
</style>
