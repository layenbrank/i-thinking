import Application from '@/components/application/application.tsx'
import ComposerContext from '@/components/applications/markdown/composer-context.tsx'
import styles from '@/components/applications/markdown/overlay.module.scss'
import { TextStyleKit } from '@tiptap/extension-text-style'
import type { Editor as Composer } from '@tiptap/react'
import {
	EditorContent as ComposerMarkdown,
	useEditor as useComposer,
	useEditorState as useComposerValue
} from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import ReactMarkdown from 'react-markdown'
import RehypeHighlight from 'rehype-highlight'
import RehypeRaw from 'rehype-raw'
import RemarkGFM from 'remark-gfm'

interface Props {
	visible: boolean
	onUpdateVisible: (value: boolean) => void
}

const extensions = [TextStyleKit, StarterKit]

export default function Overlay(props: Props) {
	const [markdown, onUpdate] = useState(
		'# Hello, markdown!\n\n```ts\nconsole.log("Hello, world!")\n```'
	)

	const composer = useComposer({
		extensions,
		content: `
<h2>
  Hi there,
</h2>
<p>
  this is a <em>basic</em> example of <strong>Tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:
</p>
<ul>
  <li>
    That’s a bullet list with one …
  </li>
  <li>
    … or two list items.
  </li>
</ul>
<p>
  Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
</p>
<pre><code class="language-css">body {
  display: none;
}</code></pre>
<p>
  I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
</p>
<blockquote>
  Wow, that’s amazing. Good work, boy! 👏
  <br />
  — Mom
</blockquote>
`
	})

	return (
		<Application.Overlay
			open={props.visible}
			onCancel={() => props.onUpdateVisible(false)}
			onOk={() => props.onUpdateVisible(false)}
		>
			<div className={styles.overlay}>
				<ComposerContext composer={composer} />
				<ComposerMarkdown editor={composer} />
				<ReactMarkdown
					remarkPlugins={[RemarkGFM]}
					rehypePlugins={[RehypeHighlight, RehypeRaw]}
					components={{
						// 自定义渲染以匹配 Typora 风格
						h1({ children }) {
							return <h1 className="typora-heading-1">{children}</h1>
						},
						h2({ children }) {
							return <h2 className="typora-heading-2">{children}</h2>
						},
						h3({ children }) {
							return <h3 className="typora-heading-3">{children}</h3>
						},
						p({ children }) {
							return <p className="typora-paragraph">{children}</p>
						},
						a({ children, href }) {
							return (
								<a href={href} className="typora-link" target="_blank" rel="noopener noreferrer">
									{children}
								</a>
							)
						},
						img({ src, alt }) {
							return <img src={src} alt={alt} className="typora-image" />
						},
						blockquote({ children }) {
							return <blockquote className="typora-blockquote">{children}</blockquote>
						},
						code({ children, className }) {
							const language = className ? className.split('language-')[1] : ''
							return <code className={`typora-code ${language}`}>{children}</code>
						},
						pre({ children }) {
							return <pre className="typora-pre">{children}</pre>
						},
						ul({ children }) {
							return <ul className="typora-list">{children}</ul>
						},
						ol({ children }) {
							return <ol className="typora-list">{children}</ol>
						},
						li({ children }) {
							return <li className="typora-list-item">{children}</li>
						},
						table({ children }) {
							return <table className="typora-table">{children}</table>
						},
						thead({ children }) {
							return <thead className="typora-table-header">{children}</thead>
						},
						tbody({ children }) {
							return <tbody className="typora-table-body">{children}</tbody>
						},
						tr({ children }) {
							return <tr className="typora-table-row">{children}</tr>
						},
						th({ children }) {
							return <th className="typora-table-header-cell">{children}</th>
						},
						td({ children }) {
							return <td className="typora-table-cell">{children}</td>
						}
					}}
				>
					{markdown}
				</ReactMarkdown>
			</div>
		</Application.Overlay>
	)
}
