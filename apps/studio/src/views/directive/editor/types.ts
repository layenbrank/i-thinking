/**
 * 编辑器用的渲染侧类型 —— 直接复用 IPC 契约的 zod 推导类型，
 * 与主进程的解析同源一致，不会各写一份。
 */

import type {
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
} from '@/shared/ipc/specs/sidecar'

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
