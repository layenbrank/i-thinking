/**
 * 工具审批的等待票据。
 *
 * 这段逻辑只有一个硬要求：**必须落地**。工具执行前挂在这里等渲染进程回执，
 * 如果回执、abort、超时三条出口里有任何一条没接住，运行就永久挂住 ——
 * 既结束不了，也取消不掉。所以它单独成模块并带单测。
 */

export interface ApprovalTicket {
  /** 渲染进程回执到达时调用；重复调用无副作用 */
  settle: (approved: boolean) => void
  /** 等待结果；上方的三条出口最终都会让它落地 */
  decision: Promise<boolean>
  /** 主动收尾（运行正常结束时调用，清掉定时器与监听） */
  dispose: () => void
}

export interface ApprovalTicketOptions {
  signal: AbortSignal
  timeoutMs: number
}

export function createApprovalTicket(options: ApprovalTicketOptions): ApprovalTicket {
  let settled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let resolveDecision: (approved: boolean) => void = function () {}

  function onAbort(): void {
    settle(false)
  }

  function cleanup(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    options.signal.removeEventListener('abort', onAbort)
  }

  function settle(approved: boolean): void {
    if (settled) return
    settled = true
    cleanup()
    resolveDecision(approved)
  }

  const decision = new Promise<boolean>(function (resolve) {
    resolveDecision = resolve

    if (options.signal.aborted) {
      settle(false)
      return
    }

    timer = setTimeout(function () {
      settle(false)
    }, options.timeoutMs)
    options.signal.addEventListener('abort', onAbort)
  })

  return {
    settle,
    decision,
    dispose() {
      settle(false)
    }
  }
}
