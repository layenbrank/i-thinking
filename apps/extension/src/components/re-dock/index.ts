import ReDock from './index.vue'

/**
 * 基础曲线函数 - 创建平滑的钟形曲线
 * @param x 归一化的距离值 (0-1)
 * @returns 曲线高度值
 */
export function baseCurve(x: number): number {
  // 确保输入值在有效范围内
  if (x < 0) return 0
  if (x > 1) return 0

  // 使用余弦函数创建更平滑的钟形曲线
  return 0.5 * (1 + Math.cos(Math.PI * (1 - x)))
}

/**
 * 创建缩放曲线函数
 * @param totalXDistance 影响范围（像素）
 * @param mouseX 鼠标X坐标
 * @param minY 最小缩放值
 * @param maxY 最大缩放值
 * @returns 缩放函数
 */
export function createCurve(
  totalXDistance: number,
  mouseX: number,
  minY: number,
  maxY: number
): (itemX: number) => number {
  // 半径范围
  const radius = totalXDistance / 2

  return function curve(itemX: number): number {
    // 计算鼠标与图标之间的距离
    const distance = Math.abs(mouseX - itemX)

    // 如果距离超过影响半径，返回最小缩放值
    if (distance > radius) {
      return minY
    }

    // 将距离映射到 0-1 范围内（距离越近，值越大）
    const normalizedDistance = 1 - distance / radius

    // 使用基础曲线函数计算平滑的缩放值
    const curveValue = baseCurve(normalizedDistance)

    // 计算最终的缩放值
    return minY + curveValue * (maxY - minY)
  }
}

export { ReDock }

// 节流函数，限制函数调用频率
// function throttle<T extends (...args: any[]) => void>(
//   fn: T,
//   delay: number
// ): (...args: Parameters<T>) => void {
//   let lastCall = 0
//   return function (...args: Parameters<T>): void {
//     const now = Date.now()
//     if (now - lastCall >= delay) {
//       lastCall = now
//       fn(...args)
//     }
//   }
// }
