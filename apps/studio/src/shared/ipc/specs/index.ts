import type { z } from 'zod'

import type { InvokeChannel, PushChannel } from '../channels'
import { CHANNELS } from '../channels'
import type { PushChannelSpec } from '../spec'
import { assistantPushSpec, assistantSpecs } from './assistant'
import { chatSpecs } from './chat'
import { devtoolsSpecs } from './devtools'
import { dialogSpecs } from './dialog'
import { docSpecs } from './doc'
import { mirrorSpecs } from './mirror'
import { overlaySpecs } from './overlay'
import { screenshotSpecs } from './screenshot'
import { sidecarPushSpec, sidecarSpecs } from './sidecar'
import { storeSpecs } from './store'
import { updaterPushSpec, updaterSpecs } from './updater'
import { userSpecs } from './user'
import { windowSpecs } from './window'
import { workspaceSpecs } from './workspace'

/** invoke 通道的契约聚合 —— 准入参/出参类型的**唯一来源** */
export const INVOKE_SPECS = {
  ...storeSpecs,
  ...devtoolsSpecs,
  ...dialogSpecs,
  ...docSpecs,
  ...overlaySpecs,
  ...userSpecs,
  ...sidecarSpecs,
  ...screenshotSpecs,
  ...chatSpecs,
  ...assistantSpecs,
  ...updaterSpecs,
  ...windowSpecs,
  ...workspaceSpecs,
  ...mirrorSpecs
} as const

/** 推送通道（主进程 → 渲染进程）的契约；无入参，不参与 invoke 注册 */
export const PUSH_SPECS = {
  ...updaterPushSpec,
  ...assistantPushSpec,
  ...sidecarPushSpec
} as const satisfies Record<PushChannel, PushChannelSpec>

export type In<K extends InvokeChannel> = z.infer<(typeof INVOKE_SPECS)[K]['in']>

export type Out<K extends InvokeChannel> = z.infer<(typeof INVOKE_SPECS)[K]['out']>

export type PushOut<K extends PushChannel> = z.infer<(typeof PUSH_SPECS)[K]['out']>

/**
 * 渲染侧方法参数元组。三种形态由入参 schema 的形态决定：
 * 无入参 → `[]`；可空入参 → `[input?]`；必需入参 → `[input]`
 */
export type ArgsOf<K extends InvokeChannel> = [In<K>] extends [void]
  ? []
  : undefined extends In<K>
    ? [input?: In<K>]
    : [input: In<K>]

/**
 * 穷尽性：契约必须**恰好**覆盖全部 invoke / push 通道 —— 既不能缺，也不能多。
 *
 * 独立于对象展开的类型推断，因此即使 TS 把 spread 推宽成可选，这里也会报错。
 */
type AssertNever<T extends never> = T

export type _SpecsMissing = AssertNever<Exclude<InvokeChannel, keyof typeof INVOKE_SPECS>>
export type _SpecsExtra = AssertNever<Exclude<keyof typeof INVOKE_SPECS, InvokeChannel>>
export type _PushMissing = AssertNever<Exclude<PushChannel, keyof typeof PUSH_SPECS>>
export type _PushExtra = AssertNever<Exclude<keyof typeof PUSH_SPECS, PushChannel>>

void 0 as unknown as _SpecsMissing
void 0 as unknown as _SpecsExtra
void 0 as unknown as _PushMissing
void 0 as unknown as _PushExtra

/** 频道 → 契约键的一致性是编译期保证；这里导出常量供启动断言使用 */
export const CONTRACT_CHANNELS = CHANNELS
