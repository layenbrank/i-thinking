import type { JSX } from 'react'

declare global {
  namespace MagneticTile {
    // interface ComponentProps extends Partial<MagneticTile> {
    // draggable: boolean
    // className: ClassValue
    // }

    // type Reflection = Record<Component, (props: ComponentProps) => JSX.Element>
    /**
     * 组件 → 渲染器。Partial：`directive` 等组件由其它 app 提供，client 未实现时跳过
     * （消费侧已按 undefined 兜底，不再要求补齐全量键）。
     */
    type Reflection = Partial<
      Record<
        MagneticTile.Component,
        React.LazyExoticComponent<(props: ProviderProps) => JSX.Element>
      >
    >
  }
}
