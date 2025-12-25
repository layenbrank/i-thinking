<script setup lang="tsx">
import {
  type Links,
  marked,
  type MarkedToken,
  type Token,
  type Tokens,
  type TokensList
} from 'marked'
import { type JSX } from 'vue/jsx-runtime'

declare function MarkdownRender(props: { tokens: TokensList }): JSX.Element

defineOptions({
  name: 'MarkdownRender'
})

const props = withDefaults(
  defineProps<{
    tokens: TokensList
  }>(),
  {}
)

const headingMap: Record<number, (token: Tokens.Heading) => JSX.Element> = {
  1: (token) => <h1>{token.text}</h1>,
  2: (token) => <h2>{token.text}</h2>,
  3: (token) => <h3>{token.text}</h3>,
  4: (token) => <h4>{token.text}</h4>,
  5: (token) => <h5>{token.text}</h5>,
  6: (token) => <h6>{token.text}</h6>
}

type RendererFn<T extends MarkedToken> = (token: T) => JSX.Element

const TokenMap: Record<MarkedToken['type'], RendererFn<any>> = {
  heading(token: Tokens.Heading) {
    // console.log('Heading', token)

    return headingMap[token.depth]?.(token) ?? <h1>{token.text}</h1>
  },
  paragraph(token: Tokens.Paragraph) {
    // return 'ParagraphToken'
    console.log('Paragraph', token)
    return (
      <p>
        {token.tokens.length ? (
          <MarkdownRender tokens={token.tokens as TokensList}></MarkdownRender>
        ) : (
          token.text
        )}
      </p>
    )
  },
  code(token: Tokens.Code) {
    // console.log('Code', token)
    return (
      <pre>
        <code>{token.text}</code>
      </pre>
    )
  },
  space() {
    return <br />
  },
  list(token: Tokens.List) {
    const Tag = (token.ordered ? 'ol' : 'ul') as any
    return (
      <Tag>
        {token.items.map((it, i) => (
          <li key={i}>{it.text}</li>
        ))}
      </Tag>
    )
  },
  blockquote(token: Tokens.Blockquote) {
    return <blockquote>{token.text}</blockquote>
  },
  table(token: Tokens.Table) {
    // return 'TableToken'
    return (
      <table>
        <thead>
          <tr>
            {token.header?.map((cell, index) => (
              <th key={index}>{cell.text}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {token.rows?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell.text}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
  br() {
    // return 'BreakToken'
    return <br />
  },
  checkbox(token: Tokens.Checkbox) {
    return (
      <input
        type="checkbox"
        checked={token.checked}
      />
    )
  },
  hr(token: Tokens.Hr) {
    // return 'ThematicBreakToken'
    return <hr />
  },
  codespan(token: Tokens.Codespan) {
    return <code>{token.text}</code>
  },
  list_item(token: Tokens.ListItem) {
    return <li>{token.text}</li>
  },
  html(token: Tokens.HTML) {
    return <div>{token.text}</div>
  },
  text(token: Tokens.Text) {
    return <span>{token.text}</span>
  },
  image(token: Tokens.Image) {
    return (
      <img
        src={token.href}
        alt={token.text}
      />
    )
  },
  link(token: Tokens.Link) {
    return (
      <a
        href={token.href}
        title={token.title ?? undefined}
        target="_blank">
        {token.text}
      </a>
    )
  },
  em(token: Tokens.Em) {
    return <em>{token.text}</em>
  },
  strong(token: Tokens.Strong) {
    return <strong>{token.text}</strong>
  },
  del(token: Tokens.Del) {
    return <del>{token.text}</del>
  },
  def(token: Tokens.Def) {
    return <span>{token.tag}</span>
  },
  escape(token: Tokens.Escape) {
    return <span>{token.text}</span>
  }
  // Add other token mappings as needed
}

function ParseTokens(tokens: TokensList) {
  // console.log(JSON.stringify(tokens, null, 2))

  for (const token of tokens) {
    // console.log('token', token.type)
    console.log('token', TokenMap[token.type as keyof typeof TokenMap]?.(token))

    // const tokenType = tokenMap[token.type as keyof typeof tokenMap] || 'unknown'

    // console.log(`Processing token of type: ${tokenType()}`)
    // Handle each token type accordingly
  }
}

// watch(
// 	() => props.tokens,
// 	(newTokens) => {
// 		ParseTokens(newTokens)
// 	},
// 	{ immediate: true, once: true }
// )
</script>

<template>
  <component
    v-for="token of tokens"
    :key="token.type + token.raw"
    :is="TokenMap[token.type as keyof typeof TokenMap]?.(token)"></component>
</template>

<style lang="scss" scoped>
.markdown-render {
  width: 100%;
  height: 100%;

  * {
    user-select: text;
  }
}
</style>
