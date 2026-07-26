/**
 * engine 类型（对齐 corex engine/schema）
 */
declare global {
  namespace Engine {
    interface Item {
      id: string
      q: string
      u: string
      t: string
    }

    interface Info {
      ig: string
    }

    interface Suggestion {
      s: Item[]
      i: Info
    }
  }
}

export {}
