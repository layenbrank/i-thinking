import type { ZodType } from 'zod'

/**
 * 单个频道的契约：入参与出参的运行时 schema。
 *
 * 用 `ZodType<any>` 而非裸 `ZodType` —— zod 的 `Input` 处于逆变位置，
 * `ZodObject<{k: string}>` 不可赋给 `ZodType<unknown, unknown>`。
 * 类型由 `z.infer` 从这两个 schema 推导，**不另行手写**。
 */
export interface ChannelSpec {
  readonly in: ZodType<any>
  readonly out: ZodType<any>
}

/** 推送通道只有出参（主进程 → 渲染进程），没有入参 schema */
export interface PushChannelSpec {
  readonly out: ZodType<any>
}
