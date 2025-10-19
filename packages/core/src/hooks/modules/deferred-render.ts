import { Subject, animationFrameScheduler, from, timer } from 'rxjs'
import { concatMap, scan, take, takeUntil, takeWhile, tap } from 'rxjs/operators'
import type { Ref } from 'vue'
import { isRef, onMounted, onUnmounted, ref, watch } from 'vue'

/**
 * 延迟渲染配置选项
 */
export interface DeferredRenderOptions {
	/**
	 * 每帧渲染的项目数量
	 * @default 0
	 */
	taskSize: number
	/**
	 * 待渲染的项目总数
	 * @default 0
	 */
	taskCount: number
}

/**
 * 使用延迟渲染优化大型列表的性能
 * @param options - 配置选项
 * @returns 延迟渲染相关的方法和属性
 */
export function useDeferredRender(options: Ref<DeferredRenderOptions> | DeferredRenderOptions) {
	// 将选项转换为响应式引用
	const optionsRef = isRef(options) ? options : ref(options)

	// 合并默认选项
	const config = ref<DeferredRenderOptions>({
		...optionsRef.value
	})

	// 当前已渲染的项目数量
	const renderedTasks = ref(0)

	// 是否正在渲染过程中
	const isRendering = ref(false)

	// 用于取消渲染流程的 Subject
	const destroy$ = new Subject<void>()

	// 监听配置变化 - 使用一个统一的监听处理所有配置变更
	watch(
		() => optionsRef.value,
		(opts) => {
			// 更新内部配置
			config.value = opts
			// 如果总数发生变化，重置渲染过程
			if (opts.taskCount && opts.taskCount !== renderedTasks.value) {
				resetRendering()
			}
		},
		{
			deep: true
		}
	)

	// 重置渲染
	function resetRendering() {
		renderedTasks.value = 0
		if (config.value.taskCount > 0) {
			startRendering()
		}
	}

	// 开始渲染流程
	function startRendering() {
		// 如果已经在渲染，则先取消现有渲染
		if (isRendering.value) destroy$.next()

		isRendering.value = true

		// 使用 RXJS 创建一个基于动画帧的定时器
		// timer(0, 0, scheduler) - 创建一个定时器，立即触发，之后每个动画帧触发一次
		timer(0, 0, animationFrameScheduler)
			.pipe(
				// takeUntil - 直到 destroy$ 发出信号时，停止流
				takeUntil(destroy$),
				// takeWhile - 当渲染项目数量小于总数时，继续流
				takeWhile(() => renderedTasks.value < config.value.taskCount),
				// concatMap - 将每一帧映射为一个新的Observable，按顺序处理
				concatMap(() => {
					// 计算本帧应该渲染的项目数
					const remainingTasks = config.value.taskCount - renderedTasks.value
					const tasksThisFrame = Math.min(config.value.taskSize, remainingTasks)

					// 创建一个包含要渲染项目的数组流
					// from([...Array(itemsThisFrame)]) - 创建一个包含itemsThisFrame个元素的数组流
					return from([...Array(tasksThisFrame)]).pipe(
						// scan - 累加渲染的项目数
						scan((acc) => acc + 1, renderedTasks.value),
						// tap - 副作用操作，更新已渲染项目数
						tap((value) => {
							renderedTasks.value = value
						}),
						// take - 只取指定数量的元素
						take(tasksThisFrame)
					)
				})
			)
			.subscribe({
				complete: () => {
					isRendering.value = false
				}
			})
	}

	// 更新配置的函数
	function updateOptions(opts: Partial<DeferredRenderOptions>) {
		// 更新原始选项对象
		if (isRef(options)) {
			options.value = { ...options.value, ...opts }
		} else {
			optionsRef.value = { ...optionsRef.value, ...opts }
		}

		// 同时更新内部配置
		config.value = {
			...config.value,
			...opts
		}

		// 检查是否需要重置渲染过程
		if (opts.taskCount && opts.taskCount !== renderedTasks.value) {
			resetRendering()
		}
	}

	// 判断某个索引是否应该被渲染的函数
	function isRender(index: number) {
		return index < renderedTasks.value
	}

	// 在组件挂载时开始渲染
	onMounted(() => {
		if (config.value.taskCount > 0) startRendering()
	})

	// 在组件卸载时清理
	onUnmounted(() => {
		destroy$.next()
		destroy$.complete()
	})

	return {
		renderedTasks,
		isRendering,
		isRender,
		updateOptions,
		resetRendering
	}
}
