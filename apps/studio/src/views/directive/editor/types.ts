/**
 * 编辑器用的渲染侧类型 —— 直接复用 IPC 契约的 zod 推导类型，
 * 与主进程的解析同源一致，不会各写一份。
 *
 * `token` 只给 React 列表 key，不落盘；YAML 步骤名仍是 `id`。
 */

import type {
  Condition,
  DirectiveCondition,
  DirectiveContent,
  DirectiveInput,
  DirectivePermissions,
  DirectiveStep as IpcDirectiveStep,
  DirectiveTrigger,
  OnError,
  Step as IpcStep,
  StepsStep as IpcStepsStep
} from '@/shared/ipc/specs/sidecar'

interface StepToken {
  /** 只给 React key，不落盘 */
  token?: string
}

type Step = IpcStep & StepToken
type DirectiveStep = IpcDirectiveStep & StepToken
type StepsStep = IpcStepsStep & StepToken

export type {
  Condition,
  DirectiveCondition,
  DirectiveContent,
  DirectiveInput,
  DirectivePermissions,
  DirectiveStep,
  DirectiveTrigger,
  OnError,
  Step,
  StepsStep
}
