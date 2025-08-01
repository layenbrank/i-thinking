import { computed, ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { MaybeRefOrGetter } from '@vueuse/shared'

/**
 * 滚轮事件状态接口
 */
export interface WheelState {
	/** X轴滚动增量 */
	deltaX: number
	/** Y轴滚动增量 */
	deltaY: number
	/** Z轴滚动增量 */
	deltaZ: number
	/** 滚动模式 */
	deltaMode: number
	/** X轴累计滚动距离 */
	totalX: number
	/** Y轴累计滚动距离 */
	totalY: number
	/** Z轴累计滚动距离 */
	totalZ: number
}

/**
 * useWheel 钩子的返回值类型
 */
export interface WheelReturn {
	/** X轴滚动增量 */
	deltaX: Ref<number>
	/** Y轴滚动增量 */
	deltaY: Ref<number>
	/** Z轴滚动增量 */
	deltaZ: Ref<number>
	/** 滚动模式 */
	deltaMode: Ref<number>
	/** X轴累计滚动距离 */
	totalX: Ref<number>
	/** Y轴累计滚动距离 */
	totalY: Ref<number>
	/** Z轴累计滚动距离 */
	totalZ: Ref<number>
	/** 重置累计滚动距离 */
	reset: () => void
}

/**
 * useWheel 钩子的配置选项
 */
export interface UseWheelOptions {
	/**
	 * 目标元素
	 * @default window
	 */
	target?: MaybeRefOrGetter<Window | EventTarget | null | undefined>
	/**
	 * 是否阻止默认滚动行为
	 * @default false
	 */
	preventDefault?: boolean
	/**
	 * 滚动步长，每次滚动事件增加或减少的固定值
	 * @default 100
	 */
	step?: number
	/**
	 * 累计滚动的最大值
	 * @default Infinity
	 */
	max?: number
	/**
	 * 累计滚动的最小值
	 * @default -Infinity
	 */
	min?: number
	/**
	 * 是否开启调试模式，开启后会输出详细的日志信息
	 * @default false
	 */
	debug?: boolean
	/**
	 * 滚轮事件回调函数
	 * @param event - 原始滚轮事件对象
	 * @param state - 当前滚轮状态，包含增量值和累计值
	 * @returns 返回false时将阻止累计值的更新
	 */
	onWheel?: (event: WheelEvent, state: WheelState) => boolean | void
}

/**
 * Vue 组合式 API，用于处理鼠标滚轮事件
 *
 * 特性：
 * - 提供标准化的滚动增量值
 * - 支持累计滚动距离跟踪
 * - 可限制滚动范围
 * - 支持调试模式
 * - 提供重置功能
 *
 * @param options - 配置选项
 * @returns 包含滚动状态和工具方法的对象
 *
 * @example 基础用法
 * ```ts
 * const { deltaY, totalY } = useWheel()
 * ```
 *
 * @example 限制滚动范围
 * ```ts
 * const { deltaY, totalY } = useWheel({
 *   min: 0,
 *   max: 1000,
 *   onWheel(event, state) {
 *     // 自定义滚动限制逻辑
 *     if (state.deltaY > 0 && state.totalY >= 1000) {
 *       return false // 停止累计
 *     }
 *   }
 * })
 * ```
 *
 * @example 调试模式
 * ```ts
 * const wheel = useWheel({
 *   debug: true,
 *   step: 50,
 *   onWheel(event, state) {
 *     // 将输出详细的滚动信息
 *   }
 * })
 * ```
 *
 * @example 在模板中使用
 * ```vue
 * <template>
 *   <div ref="el">
 *     <p>当前滚动: {{ deltaY }}</p>
 *     <p>累计滚动: {{ totalY }}</p>
 *     <button @click="reset">重置</button>
 *   </div>
 * </template>
 *
 * <script setup>
 * const el = ref(null)
 * const { deltaY, totalY, reset } = useWheel({
 *   target: el,
 *   preventDefault: true
 * })
 * </script>
 * ```
 */
export function useWheel(options: UseWheelOptions = {}) {
	const {
		target = window,
		preventDefault = false,
		onWheel,
		step = 100,
		max = Infinity,
		min = -Infinity,
		debug = false
	} = options

	const deltaX = ref(0)
	const deltaY = ref(0)
	const deltaZ = ref(0)
	const deltaMode = ref(0)
	const totalX = ref(0)
	const totalY = ref(0)
	const totalZ = ref(0)

	if (debug && max < min) {
		log('warn', 'max should be greater than min')
	}

	// 调试日志
	function log(type: keyof Console, ...data: any[]) {
		if (debug) (console[type] as (...data: any[]) => void).call(console, ...data)
	}

	// 确保值在范围内
	const clamp = (value: number) => Math.min(Math.max(value, min), max)

	// 重置方法
	const reset = () => {
		totalX.value = 0
		totalY.value = 0
		totalZ.value = 0
		log('log', 'reset wheel state')
	}

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
			// 更新累计值（确保在范围内）
			totalX.value = clamp(totalX.value + deltaX.value)
			totalY.value = clamp(totalY.value + deltaY.value)
			totalZ.value = clamp(totalZ.value + deltaZ.value)
		}

		log('table', {
			delta: { x: deltaX.value, y: deltaY.value, z: deltaZ.value },
			total: { x: totalX.value, y: totalY.value, z: totalZ.value }
		})
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
		totalZ: computed(() => totalZ.value),
		// 工具方法
		reset
	}
}
