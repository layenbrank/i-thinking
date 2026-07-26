<script setup lang="ts">
import Contextmenu from '@/components/contextmenu/contextmenu.vue'
import { useMirror } from '@/hooks/mirror'
import { useMirrorStore, type ToUpdateMagneticTile } from '@/stores/mirror.ts'
import { resize } from '@i-thinking/directives'
import Sortable from 'sortablejs'

defineOptions({
  name: 'controller',
  directives: {
    resize
  }
})

const props = withDefaults(
  defineProps<{
    size: Mirror.Size
    shape: Mirror.Shape
    direction: Mirror.Direction
  }>(),
  {
    size: 'mini',
    shape: 'rectangle',
    direction: 'horizontal'
  }
)

const store = useMirrorStore()
const { APPLICATION, CONTEXTMENU, MENUOPTIONS } = useMirror()

const controllerRef = useTemplateRef('controllerRef')
const contextmenuRef = useTemplateRef('contextmenuRef')

const visible = ref(false)
const sortable = ref<Sortable | null>(null)
const activeKey = ref<ContextMenuKeys | null>(null)

const contextDOMRect = reactive({
  x: innerWidth - 200,
  y: 200,
  width: 0,
  height: 0
})

const contextmenuMap: Readonly<ContextMenuMap> = {
  'update-app'() {
    // void
  },
  'remove-app'() {
    console.log('[Remove magneticTile]', store.magneticTile)
    void store.toRemoveMagneticTile([store.magneticTile?.id ?? ''])
  },
  'update-wallpaper'() {
    // void
  },
  'update-backup'() {
    // void
  },
  'update-settings'() {
    // store.settingsVisible = true
  }
}

const options = computed(function () {
  const magneticTile = store.magneticTiles?.find(function (magneticTile) {
    return magneticTile.id === store.magneticTile?.id
  })
  if (!magneticTile) return []
  const { component } = magneticTile
  const handler = CONTEXTMENU[component]
  return handler?.() ?? MENUOPTIONS
})

function updateActiveKey(value: ContextMenuOptions) {
  activeKey.value = value.key

  contextmenuMap[value.key]?.()
}

function handleController(e: MouseEvent) {
  const target = e.target as HTMLElement
  const closest = target.closest<HTMLElement>('.magnetic-tile')

  // if (!store.settingsVisible) return
  if (!closest?.dataset?.id) return

  const magneticTile = store.magneticTiles?.find(function (app) {
    return app.id === closest.dataset.id
  })

  store.magneticTile = magneticTile ?? null
}

function mountContext(e: MouseEvent) {
  // if (store.settingsVisible) return

  const target = e.target as HTMLElement
  const closest = target.closest<HTMLElement>('.magnetic-tile')

  const contextmenu = contextmenuRef.value?.$el as HTMLElement

  setTimeout(function () {
    if (!contextmenu) return

    contextDOMRect.width = contextmenu.clientWidth
    contextDOMRect.height = contextmenu.clientHeight

    contextDOMRect.x = Math.min(e.clientX, innerWidth - contextDOMRect.width)
    contextDOMRect.y = Math.min(e.clientY, innerHeight - contextDOMRect.height)

    visible.value = true

    if (!closest?.dataset?.id) return

    const magneticTile = store.magneticTiles?.find(function (app) {
      return app.id === closest.dataset.id
    })

    store.magneticTile = magneticTile ?? null
  }, 60)
}

function destroyContext() {
  visible.value = false
  setTimeout(() => (store.magneticTile = null), 60)
}

function handleResize(DOMRect: DOMRect) {
  contextDOMRect.width = DOMRect.width
  contextDOMRect.height = DOMRect.height
}

function handleDropZone(event: DragEvent) {
  const target = event.target as HTMLElement
  if (!target) return

  const closest = target.closest<HTMLElement>('.magnetic-tile')
  if (!closest) return

  const dataTransferID = event.dataTransfer?.getData('text/plain')
  if (!dataTransferID) return

  const magneticTile = store.magneticTiles?.find(function (magneticTile) {
    return magneticTile.id === dataTransferID
  })

  console.log(
    '[DropZone dataTransferID]',
    dataTransferID,
    '\n[DropZone magneticTile]',
    magneticTile
  )
}

function initialize() {
  if (!controllerRef.value) return
  const controller = controllerRef.value

  sortable.value = new Sortable(controller, {
    // sort: true,
    animation: 600,
    easing: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    dataIdAttr: 'data-id',
    draggable: '.sortable-draggable', // 允许拖拽的项目类名
    filter: '.sortable-ignore', // 过滤器，不需要进行拖动的元素
    // handle: '.sortable-handle',
    dragClass: 'sortable-dragger', // 正在被拖拽中的css类名
    ghostClass: 'sortable-ghost', // drop placeholder的css类名
    chosenClass: 'sortable-chosen', // 被选中项的css 类名
    swapClass: 'sortable-swap', // 交换时的css类名
    forceFallback: false, // 忽略 HTML5拖拽行为，强制回调进行
    // swap: true,
    // swapThreshold: 0.65,
    swapThreshold: 0.05,
    invertSwap: true,

    // invertedSwapThreshold: 1,
    store: {
      set(sortable) {
        const toArray = sortable.toArray()
        const updates: ToUpdateMagneticTile[] = []

        for (let i = 0; i < toArray.length; i++) {
          const ID = toArray[i]

          if (!store.magneticTiles) return

          for (let magneticTile of store.magneticTiles) {
            magneticTile = toRaw(magneticTile)
            if (!magneticTile) continue
            if (magneticTile.id !== ID) continue
            updates.push({ key: magneticTile.id, changes: { index: i } })
          }
        }
        console.log('[Sortable magneticTiles]', updates)
        void store.toUpdateMagneticTile(updates)
      },
      get(sortable) {
        const toArray = store.magneticTiles?.map(function (magneticTile) {
          return magneticTile.id
        })

        return toArray ?? []
      }
    },
    group: {
      name: 'application-collection',
      pull(to, from, dragEl, event) {
        return true
      },
      put(to, from, dragEl, event) {
        return true
      },
      checkPull(sortable, activeSortable, dragEl, event) {
        return true
      },
      checkPut(sortable, activeSortable, dragEl, event) {
        return true
      }
    },
    setData(dataTransfer, draggedElement) {
      dataTransfer.setData('text/plain', draggedElement.dataset.id ?? '')
    }
  })
}

onMounted(function () {
  initialize()
  window.addEventListener('click', destroyContext, true)
  window.addEventListener('contextmenu', destroyContext, true)
})

onUnmounted(function () {
  sortable.value?.destroy()
  window.removeEventListener('click', destroyContext)
  window.removeEventListener('contextmenu', destroyContext)
})
</script>

<template>
  <div
    @dragover.prevent
    @drop="handleDropZone"
    @click.capture="handleController"
    @contextmenu.stop.prevent="mountContext"
    ref="controllerRef"
    class="controller"
    :class="[size, shape, direction]">
    <TransitionGroup name="application-fade">
      <template
        v-for="magneticTile in store.magneticTiles"
        :key="magneticTile.id">
        <component
          :size="size"
          :shape="shape"
          :direction="direction"
          :magneticTile="magneticTile"
          :is="APPLICATION[magneticTile.component]"
          :data-id="magneticTile.id"
          class="magneticTile sortable-draggable sortable-ghost sortable-chosen sortable-swap magnetic-tile-collection" />
      </template>
    </TransitionGroup>
    <Teleport to="body">
      <Contextmenu
        ref="contextmenuRef"
        :x="contextDOMRect.x"
        :y="contextDOMRect.y"
        v-resize="handleResize"
        v-model:visible="visible"
        :options="options ?? []"
        @update:active-key="updateActiveKey"
        @contextmenu.prevent="mountContext"
        :class="[
          {
            'is-active': store.magnetic-tile && visible && options?.length
          }
        ]" />
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.controller {
  @extend %controller;
}
</style>
