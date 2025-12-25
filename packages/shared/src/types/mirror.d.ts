interface Mirror {
  id: string
  title: string
  index: number
  mark: string
  updatedAt: number
  createdAt: number
  description: string
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  background: Mirror.Background | null
  backdrop: Mirror.Backdrop | null
  overlay: string
}

declare namespace Mirror {
  /**
   * @description 组件布局方向
   */
  type Direction = 'horizontal' | 'vertical'

  /**
   * @description 组件形状
   */
  type Shape = 'square' | 'circle' | 'rectangle'

  /**
   * @description 组件尺寸
   */
  type Size = 'mini' | 'small' | 'medium' | 'large' | 'huge' | 'massive' | 'ultra'

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
}
