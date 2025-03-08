import { computed, ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { MaybeRefOrGetter } from '@vueuse/shared'

export interface WheelState {
  deltaX: number
  deltaY: number
  deltaZ: number
  deltaMode: number
  // 累计滚动距离
  totalX: number
  totalY: number
  totalZ: number
}

/**
 * 响应式鼠标滚轮事件
 *
 * @example
 * ```ts
 * // 基础用法
 * const { deltaY, totalY } = useWheel()
 *
 * // 指定目标元素
 * const el = ref<HTMLElement | null>(null)
 * const { deltaY, totalY } = useWheel({ target: el })
 *
 * // 阻止默认滚动行为
 * const { deltaY } = useWheel({ preventDefault: true })
 *
 * // 自定义滚动步长
 * const { deltaY } = useWheel({ step: 50 })
 *
 * // 限制滚动范围
 * const { deltaY, totalY } = useWheel({
 *   onWheel(event, state) {
 *     // 限制向下滚动最大距离
 *     if (state.deltaY > 0 && state.totalY >= 1000) {
 *       return false
 *     }
 *     // 限制向上滚动最小距离
 *     if (state.deltaY < 0 && state.totalY <= 0) {
 *       return false
 *     }
 *     return true
 *   }
 * })
 *
 * // 在模板中使用
 * <template>
 *   <div ref="el">
 *     <p>当前滚动: {{ deltaY }}</p>
 *     <p>累计滚动: {{ totalY }}</p>
 *   </div>
 * </template>
 * ```
 */
export interface UseWheelOptions {
  target?: MaybeRefOrGetter<Window | EventTarget | null | undefined>
  preventDefault?: boolean
  /**
   * 滚动步长
   * @default 100
   */
  step?: number
  /**
   * 滚轮事件回调
   * @param event - 原始滚轮事件对象
   * @param state - 当前滚轮状态
   * @returns 返回false时不更新累计值
   */
  onWheel?: (event: WheelEvent, state: WheelState) => boolean | void
}

export function useWheel(options: UseWheelOptions = {}) {
  const { target = window, preventDefault = false, onWheel, step = 100 } = options

  const deltaX = ref(0)
  const deltaY = ref(0)
  const deltaZ = ref(0)
  const deltaMode = ref(0)
  // 添加累计距离的ref
  const totalX = ref(0)
  const totalY = ref(0)
  const totalZ = ref(0)

  const handler = (event: WheelEvent) => {
    if (preventDefault) event.preventDefault()

    // 标准化 delta 值
    deltaX.value = Math.sign(event.deltaX) * step
    deltaY.value = Math.sign(event.deltaY) * step
    deltaZ.value = Math.sign(event.deltaZ) * step
    deltaMode.value = event.deltaMode

    const state: WheelState = {
      deltaX: deltaX.value,
      deltaY: deltaY.value,
      deltaZ: deltaZ.value,
      deltaMode: deltaMode.value,
      totalX: totalX.value,
      totalY: totalY.value,
      totalZ: totalZ.value
    }

    const shouldUpdate = onWheel?.(event, state)
    if (shouldUpdate !== false) {
      totalX.value += deltaX.value
      totalY.value += deltaY.value
      totalZ.value += deltaZ.value
    }
  }

  useEventListener(target, 'wheel', handler, {
    passive: !preventDefault
  })

  return {
    // 当前滚动值
    deltaX: computed(() => deltaX.value),
    deltaY: computed(() => deltaY.value),
    deltaZ: computed(() => deltaZ.value),
    deltaMode: computed(() => deltaMode.value),
    // 累计滚动值
    totalX: computed(() => totalX.value),
    totalY: computed(() => totalY.value),
    totalZ: computed(() => totalZ.value)
  }
}
