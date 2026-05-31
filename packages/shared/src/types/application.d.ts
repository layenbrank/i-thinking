/**
 * @description 应用组件
 */
interface Application {
  id: string
  index: number
  title: string
  url: string | null
  round: string | null
  mark: string | null
  mirrorID: string
  textSize: string | null
  updatedAt: number
  createdAt: number
  textColor: string | null
  component: Application.Component
  description: string
  collectionID: string | null
  downloadCount: number
  background: Application.Background | null
  backdrop: Application.Backdrop | null
}

declare namespace Application {
  type Collection = Omit<Application, 'mirrorID'>

  /**
   * @description 组件名称
   */
  type Component =
    | 'bookmark'
    | 'calendar'
    | 'markdown'
    | 'settings'
    | 'clipchamp'
    | 'intelligence'
    | 'navigation'
    | 'marketplace'
    | 'developer'
    | 'collection'
    | 'countdown'
    | 'signboard'
    | 'clock'
    | 'code' // 代码
    | 'gallery' // 图库
    | 'screenshot' // 图库
    | 'example'

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

  type Overlay = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>
  // type Overlay = ReturnType<Modal['info']>

  /**
   * 写入参数：不含自动生成的 id / createdAt / updatedAt
   * Rust Write 结构体中无 downloadCount，此处同步排除
   */
  type Write = Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>

  /** 查询过滤参数：仅限 Rust Read 结构体暴露的字段 */
  type Read = Partial<
    Pick<
      Application,
      | 'id'
      | 'title'
      | 'url'
      | 'description'
      | 'mirrorID'
      | 'downloadCount'
      | 'updatedAt'
      | 'collectionID'
    >
  >

  /** 更新变更字段：除 id 外所有字段均可选 */
  type Change = Partial<Omit<Application, 'id'>>

  /** 更新请求体 */
  interface Update {
    key: string
    change: Application.Change
  }
}
