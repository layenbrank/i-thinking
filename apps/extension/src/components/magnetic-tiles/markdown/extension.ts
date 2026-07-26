import { Extension, textInputRule } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const ColorHighlighter = Extension.create({
  name: 'colorHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          init(_, { doc }) {
            return findColors(doc)
          },
          apply(transaction, oldState) {
            return transaction.docChanged ? findColors(transaction.doc) : oldState
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})

export const SmilieReplacer = Extension.create({
  name: 'smilieReplacer',
  addInputRules() {
    return [
      textInputRule({ find: /-___- $/, replace: '😑 ' }),
      textInputRule({ find: /:'-\) $/, replace: '😂 ' }),
      textInputRule({ find: /':-\) $/, replace: '😅 ' }),
      textInputRule({ find: /':-D $/, replace: '😅 ' }),
      textInputRule({ find: />:-\) $/, replace: '😆 ' }),
      textInputRule({ find: /-__- $/, replace: '😑 ' }),
      textInputRule({ find: /':-\( $/, replace: '😓 ' }),
      textInputRule({ find: /:'-\( $/, replace: '😢 ' }),
      textInputRule({ find: />:-\( $/, replace: '😠 ' }),
      textInputRule({ find: /O:-\) $/, replace: '😇 ' }),
      textInputRule({ find: /0:-3 $/, replace: '😇 ' }),
      textInputRule({ find: /0:-\) $/, replace: '😇 ' }),
      textInputRule({ find: /0;\^\) $/, replace: '😇 ' }),
      textInputRule({ find: /O;-\) $/, replace: '😇 ' }),
      textInputRule({ find: /0;-\) $/, replace: '😇 ' }),
      textInputRule({ find: /O:-3 $/, replace: '😇 ' }),
      textInputRule({ find: /:'\) $/, replace: '😂 ' }),
      textInputRule({ find: /:-D $/, replace: '😃 ' }),
      textInputRule({ find: /':\) $/, replace: '😅 ' }),
      textInputRule({ find: /'=\) $/, replace: '😅 ' }),
      textInputRule({ find: /':D $/, replace: '😅 ' }),
      textInputRule({ find: /'=D $/, replace: '😅 ' }),
      textInputRule({ find: />:\) $/, replace: '😆 ' }),
      textInputRule({ find: />;\) $/, replace: '😆 ' }),
      textInputRule({ find: />=\) $/, replace: '😆 ' }),
      textInputRule({ find: /;-\) $/, replace: '😉 ' }),
      textInputRule({ find: /\*-\) $/, replace: '😉 ' }),
      textInputRule({ find: /;-\] $/, replace: '😉 ' }),
      textInputRule({ find: /;\^\) $/, replace: '😉 ' }),
      textInputRule({ find: /B-\) $/, replace: '😎 ' }),
      textInputRule({ find: /8-\) $/, replace: '😎 ' }),
      textInputRule({ find: /B-D $/, replace: '😎 ' }),
      textInputRule({ find: /8-D $/, replace: '😎 ' }),
      textInputRule({ find: /:-\* $/, replace: '😘 ' }),
      textInputRule({ find: /:\^\* $/, replace: '😘 ' }),
      textInputRule({ find: /:-\) $/, replace: '🙂 ' }),
      textInputRule({ find: /-_- $/, replace: '😑 ' }),
      textInputRule({ find: /:-X $/, replace: '😶 ' }),
      textInputRule({ find: /:-# $/, replace: '😶 ' }),
      textInputRule({ find: /:-x $/, replace: '😶 ' }),
      textInputRule({ find: />.< $/, replace: '😣 ' }),
      textInputRule({ find: /:-O $/, replace: '😮 ' }),
      textInputRule({ find: /:-o $/, replace: '😮 ' }),
      textInputRule({ find: /O_O $/, replace: '😮 ' }),
      textInputRule({ find: />:O $/, replace: '😮 ' }),
      textInputRule({ find: /:-P $/, replace: '😛 ' }),
      textInputRule({ find: /:-p $/, replace: '😛 ' }),
      textInputRule({ find: /:-Þ $/, replace: '😛 ' }),
      textInputRule({ find: /:-þ $/, replace: '😛 ' }),
      textInputRule({ find: /:-b $/, replace: '😛 ' }),
      textInputRule({ find: />:P $/, replace: '😜 ' }),
      textInputRule({ find: /X-P $/, replace: '😜 ' }),
      textInputRule({ find: /x-p $/, replace: '😜 ' }),
      textInputRule({ find: /':\( $/, replace: '😓 ' }),
      textInputRule({ find: /'=\( $/, replace: '😓 ' }),
      textInputRule({ find: />:\\ $/, replace: '😕 ' }),
      textInputRule({ find: />:\/ $/, replace: '😕 ' }),
      textInputRule({ find: /:-\/ $/, replace: '😕 ' }),
      textInputRule({ find: /:-. $/, replace: '😕 ' }),
      textInputRule({ find: />:\[ $/, replace: '😞 ' }),
      textInputRule({ find: /:-\( $/, replace: '😞 ' }),
      textInputRule({ find: /:-\[ $/, replace: '😞 ' }),
      textInputRule({ find: /:'\( $/, replace: '😢 ' }),
      textInputRule({ find: /;-\( $/, replace: '😢 ' }),
      textInputRule({ find: /#-\) $/, replace: '😵 ' }),
      textInputRule({ find: /%-\) $/, replace: '😵 ' }),
      textInputRule({ find: /X-\) $/, replace: '😵 ' }),
      textInputRule({ find: />:\( $/, replace: '😠 ' }),
      textInputRule({ find: /0:3 $/, replace: '😇 ' }),
      textInputRule({ find: /0:\) $/, replace: '😇 ' }),
      textInputRule({ find: /O:\) $/, replace: '😇 ' }),
      textInputRule({ find: /O=\) $/, replace: '😇 ' }),
      textInputRule({ find: /O:3 $/, replace: '😇 ' }),
      textInputRule({ find: /<\/3 $/, replace: '💔 ' }),
      textInputRule({ find: /:D $/, replace: '😃 ' }),
      textInputRule({ find: /=D $/, replace: '😃 ' }),
      textInputRule({ find: /;\) $/, replace: '😉 ' }),
      textInputRule({ find: /\*\) $/, replace: '😉 ' }),
      textInputRule({ find: /;\] $/, replace: '😉 ' }),
      textInputRule({ find: /;D $/, replace: '😉 ' }),
      textInputRule({ find: /B\) $/, replace: '😎 ' }),
      textInputRule({ find: /8\) $/, replace: '😎 ' }),
      textInputRule({ find: /:\* $/, replace: '😘 ' }),
      textInputRule({ find: /=\* $/, replace: '😘 ' }),
      textInputRule({ find: /:\) $/, replace: '🙂 ' }),
      textInputRule({ find: /=\] $/, replace: '🙂 ' }),
      textInputRule({ find: /=\) $/, replace: '🙂 ' }),
      textInputRule({ find: /:\] $/, replace: '🙂 ' }),
      textInputRule({ find: /:X $/, replace: '😶 ' }),
      textInputRule({ find: /:# $/, replace: '😶 ' }),
      textInputRule({ find: /=X $/, replace: '😶 ' }),
      textInputRule({ find: /=x $/, replace: '😶 ' }),
      textInputRule({ find: /:x $/, replace: '😶 ' }),
      textInputRule({ find: /=# $/, replace: '😶 ' }),
      textInputRule({ find: /:O $/, replace: '😮 ' }),
      textInputRule({ find: /:o $/, replace: '😮 ' }),
      textInputRule({ find: /:P $/, replace: '😛 ' }),
      textInputRule({ find: /=P $/, replace: '😛 ' }),
      textInputRule({ find: /:p $/, replace: '😛  ' }),
      textInputRule({ find: /=p $/, replace: '😛 ' }),
      textInputRule({ find: /:Þ $/, replace: '😛 ' }),
      textInputRule({ find: /:þ $/, replace: '😛 ' }),
      textInputRule({ find: /:b $/, replace: '😛 ' }),
      textInputRule({ find: /d: $/, replace: '😛 ' }),
      textInputRule({ find: /:\/ $/, replace: '😕 ' }),
      textInputRule({ find: /:\\ $/, replace: '😕 ' }),
      textInputRule({ find: /=\/ $/, replace: '😕 ' }),
      textInputRule({ find: /=\\ $/, replace: '😕 ' }),
      textInputRule({ find: /:L $/, replace: '😕 ' }),
      textInputRule({ find: /=L $/, replace: '😕 ' }),
      textInputRule({ find: /:\( $/, replace: '😞 ' }),
      textInputRule({ find: /:\[ $/, replace: '😞 ' }),
      textInputRule({ find: /=\( $/, replace: '😞 ' }),
      textInputRule({ find: /;\( $/, replace: '😢 ' }),
      textInputRule({ find: /D: $/, replace: '😨 ' }),
      textInputRule({ find: /:\$ $/, replace: '😳 ' }),
      textInputRule({ find: /=\$ $/, replace: '😳 ' }),
      textInputRule({ find: /#\) $/, replace: '😵 ' }),
      textInputRule({ find: /%\) $/, replace: '😵 ' }),
      textInputRule({ find: /X\) $/, replace: '😵 ' }),
      textInputRule({ find: /:@ $/, replace: '😠 ' }),
      textInputRule({ find: /<3 $/, replace: '❤️ ' }),
      textInputRule({ find: /\/shrug $/, replace: '¯\\_(ツ)_/¯' })
    ]
  }
})

export function findColors(doc: Node): DecorationSet {
  const hexColor = /(#[0-9a-f]{3,6})\b/gi
  const decorations: Decoration[] = []

  doc.descendants((node, position) => {
    if (!node.text) {
      return
    }

    Array.from(node.text.matchAll(hexColor)).forEach((match) => {
      const color = match[0]
      const index = match.index || 0
      const from = position + index
      const to = from + color.length
      const decoration = Decoration.inline(from, to, {
        class: 'color',
        style: `--color: ${color}`
      })

      decorations.push(decoration)
    })
  })

  return DecorationSet.create(doc, decorations)
}

export const MetadataExtension = Extension.create({
  name: 'metadata',
  addStorage() {
    return {
      id: null,
      createdAt: null,
      updatedAt: null
    }
  },
  addCommands() {
    return {
      setMetadata: (metadata) => {
        return ({ commands }) => {
          Object.assign(this.storage, metadata)
          // this.editor.commands.setMeta('metadata', this.storage)
          return true
        }
      }
    }
  },
  onUpdate() {
    this.storage.updatedAt = Date.now()
  }
})
