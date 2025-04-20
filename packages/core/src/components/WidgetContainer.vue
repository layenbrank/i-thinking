<script setup lang="ts">
import { useThemeStore } from '../store/theme'
import { computed } from 'vue'

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

const props = withDefaults(
  defineProps<{
    position: Position
    size: Size
    resizable?: boolean
  }>(),
  {
    resizable: true
  }
)

const emit = defineEmits<{
  (e: 'update:position', position: Position): void
  (e: 'update:size', size: Size): void
  (e: 'close'): void
}>()

const themeStore = useThemeStore()
const theme = computed(() => themeStore.getTheme())

function startResize(event: MouseEvent) {
  event.stopPropagation()
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = props.size.width
  const startHeight = props.size.height

  function onMouseMove(e: MouseEvent) {
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    emit('update:size', {
      width: Math.max(200, startWidth + deltaX),
      height: Math.max(100, startHeight + deltaY)
    })
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function startDrag(event: MouseEvent) {
  event.preventDefault()
  const startX = event.clientX - props.position.x
  const startY = event.clientY - props.position.y

  function onMouseMove(e: MouseEvent) {
    emit('update:position', {
      x: e.clientX - startX,
      y: e.clientY - startY
    })
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div
    class="widget-container"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      background: theme.glassBackground,
      color: theme.textColor
    }"
  >
    <div class="widget-header">
      <div class="drag-handle" @mousedown="startDrag"></div>
      <div class="widget-actions">
        <button class="action-button" @click="$emit('close')">
          <span class="icon">×</span>
        </button>
      </div>
    </div>
    <div class="widget-content">
      <slot></slot>
    </div>
    <div v-if="resizable" class="resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<style lang="scss" scoped>
.widget-container {
  position: absolute;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease;

  &:hover {
    .widget-actions {
      opacity: 1;
    }
  }
}

.widget-header {
  height: 24px;
  padding: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  // background: rgba(0, 0, 0, 0.2);
}

.drag-handle {
  flex: 1;
  height: 100%;
  cursor: move;
  display: flex;
  align-items: center;
  padding: 0 8px;

  // &::before {
  //   content: '';
  //   width: 100%;
  //   height: 2px;
  //   background: currentColor;
  //   opacity: 0.3;
  //   border-radius: 1px;
  // }
}

.widget-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  gap: 4px;
}

.action-button {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .icon {
    font-size: 14px;
    line-height: 1;
  }
}

.widget-content {
  flex: 1;
  overflow: auto;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: se-resize;

  &::after {
    content: '';
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 6px;
    height: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    opacity: 0.5;
  }
}
</style>
