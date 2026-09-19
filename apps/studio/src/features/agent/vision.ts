/**
 * 模型名里有没有视觉能力。
 *
 * 没有独立的能力字段，只能看名字。宁可不认（发送前提示），
 * 也不要把图塞给明确不看图的本地模型。
 */

const VISION_MARKS = [
  'vision',
  '-vl',
  'vl-',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4-turbo',
  'gpt-5',
  'claude',
  'gemini',
  'pixtral',
  'llava',
  'moondream',
  'minicpm'
]

function canSeeImages(model: string): boolean {
  const name = model.toLowerCase()
  if (!name) return false
  if (name.endsWith('vl')) return true

  return VISION_MARKS.some(function (mark) {
    return name.includes(mark)
  })
}

export { canSeeImages }
