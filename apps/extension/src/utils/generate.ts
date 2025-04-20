/**
 * @description 1. 标准 GUID 格式生成
 * @returns {string}
 */
export function generateCvid(): string {
  // 生成标准GUID
  const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

  // 转换为必应使用的格式（移除连字符并转为大写）
  return guid.replace(/-/g, '').toUpperCase()
}

/**
 * @description 2. 使用加密随机数增强安全性
 * @returns {string}
 */
export function generateSecureCvid(): string {
  const array = new Uint8Array(16)
  window.crypto.getRandomValues(array)

  // 设置版本位（GUID v4标准）
  array[6] = (array[6] & 0x0f) | 0x40
  array[8] = (array[8] & 0x3f) | 0x80

  // 转换为十六进制字符串
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}
