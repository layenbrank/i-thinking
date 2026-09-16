import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In } from '../../shared/ipc/specs'

/**
 * Provider 密钥（apiKey）的主进程存储。
 *
 * 两条硬约束：
 * - Key **只在主进程**：渲染进程能写、能问"有没有"、能删，但读不回来（读接口不出 IPC）。
 * - 系统密钥库不可用时**拒绝写入**，不退化成明文落盘。
 *
 * 依赖以最小接口注入（`SecretCipher` / `SecretStore`），与 `electron.safeStorage`、
 * `electron-store` 解耦 —— 普通 Node 即可单测。
 */

/** 加解密端口：生产实现包 `electron.safeStorage`，测试注入假实现 */
export interface SecretCipher {
  isAvailable(): boolean
  encrypt(value: string): Buffer
  decrypt(value: Buffer): string
}

/** electron-store 的最小用法面 */
export interface SecretStore {
  has(key: string): boolean
  toRead(key: string): unknown
  toWrite(key: string, value: unknown): void
  toRemove(key: string): void
}

type KeyWriteP = In<typeof CHANNELS.ASSISTANT.KEY.WRITE>
type KeyRefP = In<typeof CHANNELS.ASSISTANT.KEY.HAS>

/** 落库键名；密文以 base64 文本存 electron-store（该文件不进任何导出/同步） */
function secretKey(providerID: string): string {
  return `assistant-key:${providerID}`
}

class KeyStore {
  private readonly store: SecretStore
  private readonly cipher: SecretCipher

  constructor(store: SecretStore, cipher: SecretCipher) {
    this.store = store
    this.cipher = cipher
  }

  toWrite(providerID: string, apiKey: string): void {
    if (!this.cipher.isAvailable()) {
      throw new IpcError('ASSISTANT_KEYSTORE_UNAVAILABLE', '系统密钥库不可用，拒绝保存 apiKey')
    }
    this.store.toWrite(secretKey(providerID), this.cipher.encrypt(apiKey).toString('base64'))
  }

  has(providerID: string): boolean {
    return this.store.has(secretKey(providerID))
  }

  toRemove(providerID: string): void {
    this.store.toRemove(secretKey(providerID))
  }

  /** 仅主进程内部使用：解出明文喂给 provider 工厂 */
  findKey(providerID: string): string | null {
    const encrypted = this.store.toRead(secretKey(providerID))
    if (typeof encrypted !== 'string' || encrypted.length === 0) return null
    if (!this.cipher.isAvailable()) return null

    try {
      return this.cipher.decrypt(Buffer.from(encrypted, 'base64'))
    } catch (error) {
      // 系统密钥库换过（如重装/换机器）时解不开：当作没有，不向上抛，但必须出声
      console.warn('[assistant-key] 密钥解不开（密钥库可能变过），按未配置处理', error)
      return null
    }
  }
}

export { KeyStore, secretKey }
export type { KeyWriteP, KeyRefP }
// 临时 re-export：让既有测试与消费方不动，specs 批次收尾时移除
export { KeyWriteSchema, KeyRefSchema } from '../../shared/ipc/specs/assistant'
