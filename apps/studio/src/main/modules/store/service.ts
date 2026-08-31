import Store from 'electron-store'

export class Service {
  private readonly store = new Store()

  toRead(key: string): unknown {
    return this.store.get(key) ?? null
  }

  toWrite(key: string, value: unknown): void {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  toRemove(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  keys(): string[] {
    return Object.keys(this.store.store)
  }
}
