import { z } from 'zod'

/**
 * provider 表单校验。
 *
 * `apiKey` 不落 provider 行（进主进程 safeStorage），所以它只在表单里出现，
 * 提交时由调用方单独写给 `itc.assistant.key.toWrite`。
 */

const PROVIDER_SCHEMA = z.object({
  kind: z.string().min(1),
  name: z.string().min(1, '请填写名称').max(60, '名称过长'),
  baseUrl: z.union([z.string().url('请填写正确的地址'), z.literal('')]),
  model: z.string().min(1, '请填写默认模型').max(120),
  /** 逗号分隔的可选模型清单；留空表示只提供默认模型 */
  models: z.string().max(2000),
  apiKey: z.string().max(4096),
  enabled: z.boolean()
})

type ProviderValues = z.infer<typeof PROVIDER_SCHEMA>

/** 逗号分隔 → 数组（空 → null，与 IPC 约定一致） */
function parseModels(value: string): string[] | null {
  const models = value
    .split(',')
    .map(function (item) {
      return item.trim()
    })
    .filter(Boolean)

  return models.length > 0 ? models : null
}

function formatModels(models: string[] | null): string {
  return models ? models.join(', ') : ''
}

export { PROVIDER_SCHEMA, parseModels, formatModels }
export type { ProviderValues }
