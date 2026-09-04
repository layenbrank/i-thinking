export function generateColor() {
  // 生成随机 RGB
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  // 半透明 alpha（如 0.3 ~ 0.7 之间）
  const a = (Math.random() * 0.4 + 0.3).toFixed(2)
  // 转为十六进制并拼接
  const hex = (x: number) => x.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}${Math.round(Number(a) * 255)
    .toString(16)
    .padStart(2, '0')}`
}
