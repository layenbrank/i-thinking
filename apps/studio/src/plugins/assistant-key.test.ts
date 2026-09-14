import { beforeEach, describe, expect, it } from 'vitest'

import { KeyStore, secretKey, type SecretCipher, type SecretStore } from './assistant-key'

/** 内存版 electron-store 替身 */
class MemoryStore implements SecretStore {
  private readonly entries = new Map<unknown, unknown>()

  has(key: string): boolean {
    return this.entries.has(key)
  }

  toRead(key: string): unknown {
    return this.entries.get(key) ?? null
  }

  toWrite(key: string, value: unknown): void {
    this.entries.set(key, value)
  }

  toRemove(key: string): void {
    this.entries.delete(key)
  }

  toRaw(key: string): unknown {
    return this.entries.get(key)
  }
}

/** 假密钥库：明文前缀 `enc:`，便于断言落盘内容不是明文 */
function buildCipher(available = true): SecretCipher {
  return {
    isAvailable: function () {
      return available
    },
    encrypt: function (value) {
      return Buffer.from(`enc:${value}`, 'utf8')
    },
    decrypt: function (value) {
      const text = value.toString('utf8')
      if (!text.startsWith('enc:')) throw new Error('bad ciphertext')
      return text.slice(4)
    }
  }
}

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111'
const API_KEY = 'sk-living-in-main-only'

let store: MemoryStore

beforeEach(function () {
  store = new MemoryStore()
})

describe('KeyStore', function () {
  it('写入后只落密文，能读回明文', function () {
    const keys = new KeyStore(store, buildCipher())

    keys.toWrite(PROVIDER_ID, API_KEY)

    expect(keys.has(PROVIDER_ID)).toBe(true)
    const stored = store.toRaw(secretKey(PROVIDER_ID))
    expect(typeof stored).toBe('string')
    expect(String(stored)).not.toContain(API_KEY)
    expect(Buffer.from(String(stored), 'base64').toString('utf8')).toBe(`enc:${API_KEY}`)
    expect(keys.findKey(PROVIDER_ID)).toBe(API_KEY)
  })

  it('删除后不再有该 provider 的密钥', function () {
    const keys = new KeyStore(store, buildCipher())
    keys.toWrite(PROVIDER_ID, API_KEY)

    keys.toRemove(PROVIDER_ID)

    expect(keys.has(PROVIDER_ID)).toBe(false)
    expect(keys.findKey(PROVIDER_ID)).toBeNull()
  })

  it('系统密钥库不可用时拒绝写入（不退化成明文）', function () {
    const keys = new KeyStore(store, buildCipher(false))

    expect(function () {
      keys.toWrite(PROVIDER_ID, API_KEY)
    }).toThrow(/密钥库不可用/)
    expect(keys.has(PROVIDER_ID)).toBe(false)
  })

  it('密钥库事后不可用 / 密文损坏时读回 null', function () {
    const available = { value: true }
    const cipher: SecretCipher = {
      isAvailable: function () {
        return available.value
      },
      encrypt: function (value) {
        return Buffer.from(`enc:${value}`, 'utf8')
      },
      decrypt: function (value) {
        const text = value.toString('utf8')
        if (!text.startsWith('enc:')) throw new Error('bad ciphertext')
        return text.slice(4)
      }
    }
    const keys = new KeyStore(store, cipher)
    keys.toWrite(PROVIDER_ID, API_KEY)

    available.value = false
    expect(keys.findKey(PROVIDER_ID)).toBeNull()

    available.value = true
    store.toWrite(secretKey(PROVIDER_ID), Buffer.from('乱码', 'utf8').toString('base64'))
    expect(keys.findKey(PROVIDER_ID)).toBeNull()
  })

  it('未写入过的 provider 读回 null', function () {
    const keys = new KeyStore(store, buildCipher())
    expect(keys.findKey(PROVIDER_ID)).toBeNull()
    expect(keys.has(PROVIDER_ID)).toBe(false)
  })
})
