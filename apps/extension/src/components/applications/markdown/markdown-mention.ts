import { computePosition, flip, shift } from '@floating-ui/dom'
import type { Editor } from '@tiptap/vue-3'
import { posToDOMRect, VueRenderer } from '@tiptap/vue-3'
import MarkdownMention from './markdown-mention.vue'

async function updatePosition(editor: Editor, element: HTMLElement) {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to)
  }

  const resp = await computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()]
  })
  const { x, y, strategy } = resp
  element.style.width = 'max-content'
  element.style.position = strategy
  element.style.left = `${x}px`
  element.style.top = `${y}px`
}

export default {
  items({ query }: { query: string }) {
    return [
      'Lea Thompson',
      'Cyndi Lauper',
      'Tom Cruise',
      'Madonna',
      'Jerry Hall',
      'Joan Collins',
      'Winona Ryder',
      'Christina Applegate',
      'Alyssa Milano',
      'Molly Ringwald',
      'Ally Sheedy',
      'Debbie Harry',
      'Olivia Newton-John',
      'Elton John',
      'Michael J. Fox',
      'Axl Rose',
      'Emilio Estevez',
      'Ralph Macchio',
      'Rob Lowe',
      'Jennifer Grey',
      'Mickey Rourke',
      'John Cusack',
      'Matthew Broderick',
      'Justine Bateman',
      'Lisa Bonet'
    ]
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5)
  },

  render() {
    let component: VueRenderer

    return {
      onStart(props: Record<string, any>) {
        component = new VueRenderer(MarkdownMention, {
          props,
          editor: props.editor
        })

        if (!props.clientRect) {
          return
        }

        const element = component.element as HTMLElement

        if (!element) return

        element.style.position = 'absolute'

        document.body.appendChild(element)

        void updatePosition(props.editor, element)
      },

      onUpdate(props: Record<string, any>) {
        component.updateProps(props)

        if (!props.clientRect) return

        const element = component.element as HTMLElement

        if (!element) return

        void updatePosition(props.editor, element)
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          component.destroy()
          component.element?.remove()

          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        component.destroy()
        component.element?.remove()
      }
    }
  }
}
