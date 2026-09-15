import type { z } from 'zod'

import { devtoolsSpecs } from './devtools'
import { docSpecs } from './doc'
import { storeSpecs } from './store'

/**
 * invoke 通道的契约聚合 —— 准入参/出参类型的**唯一来源**。
 *
 * 分批迁入中。全部到位后再收紧约束到 `InvokeChannel` 并加穷尽性断言
 * （`Exclude<InvokeChannel, keyof typeof INVOKE_SPECS>` 必须为 never）。
 */
export const INVOKE_SPECS = {
  ...storeSpecs,
  ...devtoolsSpecs,
  ...docSpecs
} as const

export type SpecChannel = keyof typeof INVOKE_SPECS

export type In<K extends SpecChannel> = z.infer<(typeof INVOKE_SPECS)[K]['in']>

export type Out<K extends SpecChannel> = z.infer<(typeof INVOKE_SPECS)[K]['out']>

/**
 * 渲染侧方法参数元组。三种形态与今天手写的 `ITC` 保持一致：
 * 无入参 → `[]`；可空入参 → `[input?]`；必需入参 → `[input]`
 */
export type ArgsOf<K extends SpecChannel> = [In<K>] extends [void]
  ? []
  : undefined extends In<K>
    ? [input?: In<K>]
    : [input: In<K>]
