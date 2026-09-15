import type { IpcMainInvokeEvent } from 'electron'

import type {
  ChannelOfDomain,
  Domain,
  InvokeChannel,
  PushChannel
} from '../../shared/ipc/channels'
import type { In, Out } from '../../shared/ipc/specs'

/**
 * 单个 handler。入参**已由 wrapper 解析**（类型即 `In<K>`，不是 unknown），
 * event 原样透传供 senderFrame 之类的用法。
 */
export type Handler<K extends InvokeChannel> = (
  input: In<K>,
  event: IpcMainInvokeEvent
) => Promise<Out<K>> | Out<K>

/**
 * 全部 invoke 通道的 handler 表。
 * 装配点用 `satisfies Handlers` —— 漏一个、多一个、返回类型不对都是编译错误。
 */
export type Handlers = { [K in InvokeChannel]: Handler<K> }

/**
 * 单个域的 handler 切片。
 * `DomainHandlers<'store'>` 会解析成具体的对象类型，因此每个域的文件里
 * `input` 自动获得精确类型，缺失频道与多余键都会报错。
 */
export type DomainHandlers<D extends Domain> = {
  [K in Exclude<ChannelOfDomain<D>, PushChannel>]: Handler<K>
}
