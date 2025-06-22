<script setup lang="ts">
import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { draggableTransfer } from '@/utils/draggable-transfer'
import DropZone from '@/components/DropZone.vue'

defineOptions({
  name: 'DragDropExample'
})

const containerRef = ref<HTMLElement | null>(null)

// 源数据
const items = ref([
  { id: '1', name: '文档', type: 'file', icon: '📄' },
  { id: '2', name: '图片', type: 'image', icon: '🖼️' },
  { id: '3', name: '音频', type: 'audio', icon: '🎵' }
])

// 放置的数据
const droppedItems = ref<
  Array<{
    id: string
    name: string
    type: string
    icon: string
    droppedAt: string
  }>
>([])

// 拖拽状态
const isDragging = ref(false)
const currentDragElement = ref<HTMLElement | null>(null)
let draggableInstance: any = null

// 拖拽配置
const draggableSelector = '.draggable'
const dropZoneSelector = '.drop-zone'

// 初始化拖拽
function handleReloadDrag() {
  if (!containerRef.value) {
    console.warn('❌ containerRef 未找到')
    return
  }

  gsap.registerPlugin(Draggable)

  const draggableElements = containerRef.value.querySelectorAll(draggableSelector)
  // console.log('🔍 找到拖拽元素:', draggableElements.length, '个')

  // if (!draggableElements.length) {
  //   console.warn('❌ 未找到拖拽元素，选择器:', draggableSelector)
  //   return
  // }

  draggableInstance = Draggable.create(draggableElements, {
    type: 'x,y',

    onPress() {
      console.log('🖱️ onPress 触发')
      const element = this.target as HTMLElement
      currentDragElement.value = element

      // 在 onPress 中设置拖拽数据
      const itemId = element.dataset.itemId
      const item = items.value.find((i) => i.id === itemId)

      if (!item) return

      console.log('📝 设置拖拽数据:', item)

      // 设置到 draggableTransfer
      draggableTransfer.clear()

      draggableTransfer.set(
        'text/plain',
        JSON.stringify({
          item,
          source: 'drag-example',
          timestamp: Date.now()
        })
      )
    },

    onDragStart() {
      const element = this.target as HTMLElement
      isDragging.value = true
      element.classList.add('dragging')
    },

    onDragEnd(e: any) {
      const element = this.target as HTMLElement
      isDragging.value = false
      currentDragElement.value = null
      element.classList.remove('dragging')

      // 检测放置目标并触发 custom-drop 事件
      if (draggableTransfer.size() > 0) {
        // 获取鼠标释放位置下方的所有元素（从最上层到最下层）
        // e.clientX/e.clientY 是相对于浏览器视口的坐标
        // 返回一个元素数组，按 z-index 从高到低排序
        const elementsBelow = document.elementsFromPoint(e.clientX || 0, e.clientY || 0)

        // 在所有元素中查找第一个匹配 dropZoneSelector 的元素
        // dropZoneSelector = '.drop-zone'，即查找具有 drop-zone 类的元素
        // find() 返回第一个匹配的元素，如果没找到则返回 undefined
        const dropZone = elementsBelow.find((el) => el.matches(dropZoneSelector))

        if (dropZone && dropZone !== element) {
          // 触发 custom-drop 事件
          const customDropEvent = new CustomEvent('custom-drop', {
            detail: {
              dragData: draggableTransfer,
              dragElement: element,
              timestamp: Date.now()
            },
            bubbles: true,
            cancelable: true
          })

          dropZone.dispatchEvent(customDropEvent)
          console.log('🎯 触发 custom-drop 事件')
        }
      }
    }
  })

  // console.log('✅ GSAP Draggable 实例创建成功:', draggableInstance.length, '个')
}

// 销毁拖拽
function destroyDrag() {
  if (draggableInstance) {
    draggableInstance.forEach((instance: any) => instance.kill())
    draggableInstance = null
  }
  draggableTransfer.clear()
  isDragging.value = false
  currentDragElement.value = null
}

// 处理放置事件
function handleDrop() {
  // 从 draggableTransfer 获取数据
  const itemData = draggableTransfer.get('text/plain')
  if (itemData) {
    const item = JSON.parse(itemData)
    console.log('📦 接收拖拽数据:', item)

    if (!droppedItems.value.find((existingItem) => existingItem.id === item.id)) {
      droppedItems.value.push({
        ...item,
        droppedAt: new Date().toLocaleTimeString()
      })
    }
  }
}

function clearDropped() {
  droppedItems.value = []
}

// 生命周期
onMounted(function () {
  handleReloadDrag()
  containerRef.value?.addEventListener('custom-drop', function (e) {
    console.log('🎯 父组件 接收到 custom-drop 事件', e)
  })
})

onUnmounted(destroyDrag)
</script>

<template>
  <div ref="containerRef" class="drag-example">
    <div class="header">
      <h2>🎯 简洁拖拽示例</h2>
      <div class="status">
        {{ isDragging ? '拖拽中' : '空闲' }}
        <span v-if="currentDragElement" class="current">
          - {{ currentDragElement.dataset.itemId }}
        </span>
      </div>
    </div>

    <div class="content">
      <div class="source">
        <h3>📦 拖拽源</h3>
        <div
          v-for="item in items"
          :key="item.id"
          :data-item-id="item.id"
          class="draggable item"
          :class="{ active: currentDragElement?.dataset.itemId === item.id }"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="name">{{ item.name }}</span>
          <span class="type">{{ item.type }}</span>
        </div>
      </div>

      <DropZone :items="droppedItems" @drop="handleDrop" @clear="clearDropped" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.drag-example {
  padding: 24px;
  /* 可选择的渐变背景方案：*/
  /* 蓝色海洋：linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); */
  /* 绿色自然：linear-gradient(135deg, #00b894 0%, #00cec9 100%); */
  /* 橙色活力：linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%); */
  /* 深色专业：linear-gradient(135deg, #2d3436 0%, #636e72 100%); */
  background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;

  h2 {
    margin: 0 0 16px 0;
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    letter-spacing: -0.5px;
  }

  .status {
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 8px 16px;
    display: inline-block;
    border: 1px solid rgba(255, 255, 255, 0.2);

    .current {
      color: #ffd700;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
  }
}

.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.source {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition:
    // transform 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  h3 {
    margin: 0 0 20px 0;
    color: #2d3748;
    font-size: 1.4rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  cursor: grab;
  margin-bottom: 12px;
  // transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: rgba(103, 126, 234, 0.3);

    &::before {
      opacity: 1;
    }
  }

  &.active {
    border-color: #667eea;
    background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);

    &::before {
      opacity: 1;
    }
  }

  &.dragging {
    cursor: grabbing;
    opacity: 0.9;
    transform: rotate(3deg) scale(1.08);
    z-index: 1000;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
    border-color: #667eea;
  }

  .icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }

  .name {
    flex: 1;
    font-weight: 600;
    font-size: 16px;
    color: #2d3748;
    position: relative;
    z-index: 1;
  }

  .type {
    font-size: 12px;
    font-weight: 500;
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
    padding: 4px 12px;
    border-radius: 16px;
    border: 1px solid rgba(102, 126, 234, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .drag-example {
    padding: 16px;
  }

  .header h2 {
    font-size: 2rem;
  }

  .content {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .source {
    padding: 20px;
  }

  .item {
    padding: 14px;
    gap: 12px;

    .icon {
      width: 36px;
      height: 36px;
      font-size: 20px;
    }

    .name {
      font-size: 15px;
    }
  }
}

@media (max-width: 480px) {
  .drag-example {
    padding: 12px;
  }

  .header h2 {
    font-size: 1.8rem;
  }

  .content {
    gap: 20px;
  }

  .source {
    padding: 16px;
  }

  .item {
    padding: 12px;
    gap: 10px;
  }
}

// 暗色模式支持
@media (prefers-color-scheme: dark) {
  .drag-example {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
  }

  .source {
    background: rgba(45, 55, 72, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .source h3 {
    color: #e2e8f0;
  }

  .item {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);

    &:hover {
      background: linear-gradient(135deg, #4a5568 0%, #718096 100%);
    }

    .name {
      color: #e2e8f0;
    }

    .icon {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
