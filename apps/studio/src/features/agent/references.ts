/**
 * 引用的清洗与收集。
 *
 * 引用名单来自 UI（工作区相对路径），会进到模型的系统提示词里 ——
 * 所以这里做一次归一：去控制字符、限长、限条数、去重。
 * 真正的越界拦截不在这里（那必须由主进程的路径约束负责）。
 */

const MAX_REFERENCES = 20
const MAX_LENGTH = 1024

/** 去控制字符（含换行），避免把提示词结构撑坏 */
function normalize(value: string): string {
  let out = ''

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    out += code < 0x20 || code === 0x7f ? ' ' : char
  }

  return out.trim().slice(0, MAX_LENGTH)
}

export function sanitizeReferences(values: readonly string[]): string[] {
  const out: string[] = []

  for (const value of values) {
    const normalized = normalize(value)
    if (!normalized) continue
    if (out.includes(normalized)) continue

    out.push(normalized)
    if (out.length >= MAX_REFERENCES) break
  }
  return out
}

/** 从消息历史里取「最后一条用户消息」引用的文件；没有就返回空 */
export function findLatestReferences(
  messages: readonly { role: string; attachments?: readonly string[] }[]
): string[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'user') continue
    return sanitizeReferences(message.attachments ?? [])
  }
  return []
}
