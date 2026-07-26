/**
 * @description: 获取时间数组
 */
export function formatTimeToDigits(date: Date = new Date()): number[] {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  return [
    ...convertToDigitArray(hours),
    ...convertToDigitArray(minutes),
    ...convertToDigitArray(seconds)
  ]
}

/**
 * 将数字转换为数字数组
 * @param num - 需要转换的数字
 * @returns 数字数组 [0,9] 或 [1,2]等
 */
export function convertToDigitArray(num: number): number[] {
  return num >= 10 ? String(num).split('').map(Number) : [0, num]
}

/**
 * 获取下一秒的精确延迟时间
 * @returns 距离下一秒的毫秒数
 */
export function getNextTickDelay(): number {
  const now = performance.now()
  return 1000 - (now % 1000)
}
