import Store from 'electron-store'

export class StoreService {
  private readonly store = new Store()

  get(key: string): unknown {
    return this.store.get(key) ?? null
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  keys(): string[] {
    return Object.keys(this.store.store)
  }
}
