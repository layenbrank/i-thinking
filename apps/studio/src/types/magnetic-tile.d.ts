import type { JSX, LazyExoticComponent } from 'react'

declare global {
  namespace MagneticTile {
    /**
     * 磁贴组件的反射表：component 名 → 懒加载组件。
     * 组件接收完整 `MagneticTile` 实体作为 props（Controller 以 `{...tile}` 展开传入）。
     * Partial：白名单未登记的 component 允许缺省（Controller 兜底跳过）。
     */
    type Reflection = Readonly<
      Partial<
        Record<MagneticTile.Component, LazyExoticComponent<(props: MagneticTile) => JSX.Element>>
      >
    >
  }
}
