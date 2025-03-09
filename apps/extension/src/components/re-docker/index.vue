<script setup lang="ts">
import { throttle } from 'lodash-es'
import { createCurve } from './index.ts'
import { onMounted, ref, onBeforeUnmount, reactive, nextTick } from 'vue'
import { useTemplateRefsList } from '@vueuse/core'

defineOptions({
  name: 'ReDocker'
})

// 菜单引用
const menuRef = useTemplateRef<HTMLElement>('menuRef')
const menuItemsRef = useTemplateRefsList<HTMLElement>()

// 配置参数
const range = 300 // 影响范围（像素）
const maxScale = 1.3 // 最大缩放比例
const throttleDelay = 30 // 增加节流延迟，减少更新频率
// 应用缩放效果，使用防抖动策略
let lastMouseX = 0
let animationFrameId: number | null = null
let isMouseInMenu = false
// 存储每个图标的初始位置信息（相对于文档）
let itemPositions: number[] = []

// 图标数据
const icons = ref([
  { id: 1, icon: '📱', name: '手机' },
  { id: 2, icon: '💻', name: '电脑' },
  { id: 3, icon: '🎮', name: '游戏' },
  { id: 4, icon: '🎵', name: '音乐' },
  { id: 5, icon: '📷', name: '相机' },
  { id: 6, icon: '🎬', name: '视频' },
  { id: 7, icon: '📚', name: '图书' },
  { id: 8, icon: '🔍', name: '搜索' },
  { id: 9, icon: '⚙️', name: '设置' },
  { id: 10, icon: '🗑️', name: '回收站' }
])

// 存储每个图标的缩放值
const iconScales = reactive(
  Array(icons.value.length)
    .fill(1)
    .map(() => ({ scale: 1 }))
)

// 存储每个间隙的缩放值
const gapScales = reactive(
  Array(icons.value.length - 1)
    .fill(1)
    .map(() => ({ scale: 1 }))
)

// 计算并存储每个图标的中心位置
function cacheItemPositions(): void {
  // 清空数组但保持引用
  itemPositions = []

  // 计算每个图标的中心位置
  for (const item of menuItemsRef.value) {
    const rect = item.getBoundingClientRect()
    // 存储绝对位置，减少相对位置计算带来的误差
    itemPositions.push(rect.left + rect.width / 2)
  }
}

// 窗口大小变化时重新缓存位置
function handleResize() {
  setTimeout(cacheItemPositions, 0)
}

const handleMouseMove = throttle((e: MouseEvent) => {
  // 取消之前的动画帧请求
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  // 请求新的动画帧
  animationFrameId = requestAnimationFrame(() => {
    applyScaling(e.clientX)
    animationFrameId = null
  })
}, throttleDelay)

// 鼠标进入菜单
function handleMouseEnter() {
  isMouseInMenu = true
  setTimeout(cacheItemPositions, 30) // 重新计算位置
}

// 鼠标离开菜单
function handleMouseLeave() {
  isMouseInMenu = false
  resetScaling() // 重置缩放
}

function applyScaling(mouseX: number): void {
  // 如果鼠标不在菜单中，不应用缩放
  if (!isMouseInMenu) {
    resetScaling()
    return
  }

  // 如果鼠标移动距离很小，不更新以减少抖动
  if (Math.abs(mouseX - lastMouseX) < 2) return

  lastMouseX = mouseX

  // 创建缩放曲线函数
  const scaleCurve = createCurve(range, mouseX, 1, maxScale)

  // 批量更新所有图标的缩放值
  const newIconScales = [...iconScales]
  const newGapScales = [...gapScales]

  // 应用到每个图标
  for (let index = 0; index < menuItemsRef.value.length; index++) {
    // 使用缓存的位置，避免重复计算
    const itemCenterX = itemPositions[index] || 0

    // 计算缩放值，保留两位小数减少微小变化
    const scale = parseFloat(scaleCurve(itemCenterX).toString())

    // 更新缩放值，只有当值变化超过阈值时才更新
    if (Math.abs(newIconScales[index].scale - scale) > 0.01) {
      newIconScales[index].scale = scale
    }

    // 同时调整相邻的间隙
    if (index < newGapScales.length) {
      let nextScale = scale
      if (index + 1 < menuItemsRef.value.length) {
        const nextCenterX = itemPositions[index + 1] || 0
        nextScale = parseFloat(scaleCurve(nextCenterX).toString())
      }

      const gapScale = parseFloat(((scale + nextScale) / 2).toString())

      // 只有当值变化超过阈值时才更新
      if (Math.abs(newGapScales[index].scale - gapScale) > 0.01) {
        newGapScales[index].scale = gapScale
      }
    }
  }

  // 批量更新响应式数据
  for (let index = 0; index < newIconScales.length; index++) {
    iconScales[index].scale = newIconScales[index].scale
  }

  // 批量更新响应式数据
  for (let index = 0; index < newGapScales.length; index++) {
    gapScales[index].scale = newGapScales[index].scale
  }
}

// 重置所有元素到初始状态
function resetScaling(): void {
  // 取消任何待处理的动画帧
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // 重置所有缩放值
  for (const item of iconScales) {
    item.scale = 1
  }

  for (const item of gapScales) {
    item.scale = 1
  }
}

// 使用节流函数包装鼠标移动处理

onMounted(async () => {
  // 等待下一个渲染周期，确保DOM已经渲染
  await nextTick()
  // 初始化时缓存位置，使用更长的延迟确保完全渲染
  setTimeout(cacheItemPositions, 0)
})

// 组件卸载前清理事件监听
onBeforeUnmount(() => {
  menuRef.value?.removeEventListener('mousemove', handleMouseMove)
  menuRef.value?.removeEventListener('mouseenter', handleMouseEnter)
  menuRef.value?.removeEventListener('mouseleave', handleMouseLeave)

  // 取消任何待处理的动画帧
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  // 确保在组件卸载时重置所有缩放
  resetScaling()
})
</script>

<template>
  <div class="dock">
    <div
      v-resize="handleResize"
      @mousemove="handleMouseMove"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      ref="menuRef"
      class="menu"
    >
      <template v-for="(item, index) in icons" :key="item.id">
        <div
          :ref="menuItemsRef.set"
          class="menu-item"
          :title="item.name"
          :style="{
            '--scale': iconScales[index].scale
          }"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.name }}</span>
        </div>
        <div
          v-if="index < icons.length - 1"
          class="item-gap"
          :style="{
            '--scale': gapScales[index].scale
          }"
        ></div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dock {
  @apply w-full h-full flex items-end justify-center pb-5;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.05));

  .menu {
    @apply h-[67.3px] flex items-end justify-center rounded-2xl px-3 py-2;
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    position: relative; /* 使用相对定位而不是固定定位 */
    overflow: visible;
    // border: 1px solid rgba(255, 255, 255, 0.5);
    z-index: 10;
  }

  .menu-item {
    @apply flex flex-col items-center justify-center rounded-xl cursor-pointer;
    width: calc(var(--scale, 1) * 50px);
    height: calc(var(--scale, 1) * 50px);
    // width: 50px;
    // height: 50px;
    margin-bottom: calc(var(--scale, 1) * 15px - 15px);
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform-origin: bottom center;
    position: relative;
    z-index: 9999;
    will-change: transform, width, height;
    transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    // gpu 加速
    transform: translateZ(0);

    &:hover {
      filter: brightness(1.1);
    }

    .icon {
      font-size: calc(var(--scale, 1) * 24px);
      transition: font-size 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .label {
      position: absolute;
      top: -25px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      opacity: 0;
      transform: translateY(5px);
      transition:
        opacity 0.2s,
        transform 0.2s;
      pointer-events: none;
      white-space: nowrap;
    }

    &:hover .label {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .item-gap {
    width: calc(var(--scale, 1) * 10px);
    // width: 10px;
    height: 50px;
    transform-origin: bottom center;
    transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
</style>
