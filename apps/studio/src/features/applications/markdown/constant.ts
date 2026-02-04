const MARKDOWN = `
## Hi there

  this is a *basic* example of **Tiptap**. Sure, there are
  all kind of basic text styles you’d probably expect from a text editor. But
  wait until you see the lists:

- That’s a bullet list with one …
- … or two list items.

Isn’t that great? And all of that is editable. But wait, there’s more. Let’s
try a code block:

\`\`\`css
body {
  display: none;
}
\`\`\`

  I know, I know, this is impressive. It’s only the tip of the iceberg though.
  Give it a try and click a little bit around. Don’t forget to check the other
  examples too.


>  Wow, that’s amazing. Good work, boy! 👏
>
>  — Mom

`

// types
export interface MarkdownSchema {
  type: string
  content: MarkdownSchemaContent[]
}

export interface MarkdownSchemaContent {
  type: string
  attrs?: PurpleAttrs
  content: PurpleContent[]
}

export interface PurpleAttrs {
  textAlign?: null | string
  nodeTextAlign?: null
  nodeVerticalAlign?: null
  backgroundColor?: null
  start?: number
  type?: null
  level?: number
  language?: string
}

export interface PurpleContent {
  type: string
  text?: string
  attrs?: FluffyAttrs
  content?: FluffyContent[]
  marks?: Mark[]
}

export interface FluffyAttrs {
  textAlign?: null
  nodeTextAlign?: null
  nodeVerticalAlign?: null
  backgroundColor?: null
  checked?: boolean
}

export interface FluffyContent {
  type: Type
  text?: string
  attrs?: TentacledAttrs
  content?: TentacledContent[]
}

export interface TentacledAttrs {
  textAlign?: null
  nodeTextAlign: null | string
  nodeVerticalAlign: null
  backgroundColor: null
  colspan?: number
  rowspan?: number
  colwidth?: number[] | null
}

export interface TentacledContent {
  type: Type
  text?: string
  attrs?: FluffyAttrs
  content?: StickyContent[]
}

export interface StickyContent {
  type: Type
  text: string
}

export type Type = 'paragraph' | 'tableCell' | 'text'

export interface Mark {
  type: string
  attrs: MarkAttrs
}

export interface MarkAttrs {
  color?: string
  backgroundColor?: null
  fontFamily?: null
  fontSize?: null
  lineHeight?: null
  href?: string
  target?: string
  rel?: string
  class?: null
}

export { MARKDOWN }
