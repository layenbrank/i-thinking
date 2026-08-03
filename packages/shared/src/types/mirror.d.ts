interface Mirror {
  id: string
  title: string
  index: number
  mark: string
  updatedAt: number
  createdAt: number
  description: string
  background: Mirror.Background | null
  backdrop: Mirror.Backdrop | null
  overlay: string
  archivedAt: number | null
}

declare namespace Mirror {
  type Size = MagneticTile.Size
  type Shape = MagneticTile.Shape
  type Direction = MagneticTile.Direction

  interface Backdrop {
    blur?: string
    brightness?: string
    contrast?: string
    dropShadow?: string
    grayscale?: string
    hueRotate?: string
    opacity?: string
    saturate?: string
    sepia?: string
    url?: string
  }

  interface Background {
    color?: string
    image?: string
    repeat?: string
    size?: string
    position?: string
    attachment?: string
    clip?: string
    blendMode?: string
    origin?: string
  }

  /** 写入参数：全量字段，不含自动生成的 id / createdAt / updatedAt */
  type Write = Omit<Mirror, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>

  /** 查询过滤参数：仅限 Rust Read 结构体暴露的字段 */
  type Read = Partial<Pick<Mirror, 'id' | 'title' | 'mark'>>

  /** 更新变更字段：除 id 外所有字段均可选 */
  type Change = Partial<Omit<Mirror, 'id'>>

  /** 更新请求体 */
  interface Update {
    key: string
    change: Mirror.Change
  }
}
