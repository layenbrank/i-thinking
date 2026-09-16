import { cn } from 'cn'
import { Switch as SwitchPrimitive } from 'radix-ui'
import * as React from 'react'

/**
 * radix 的 Switch 在 `<form>` 内会额外渲染一个隐藏的 `<input type="checkbox">`（供表单提交用）。
 * 它是按钮的**兄弟节点**（radix 内部用 Fragment 渲染），样式为 `position: absolute`
 * 且不带 top/left，只靠 `translateX(-100%)` 回到按钮上方 —— 前提是「最近的定位祖先」
 * 恰好就在按钮所在位置。
 *
 * 若按钮的祖先里没有定位元素，这个 input 的包含块会退化成初始包含块（文档），
 * 于是它按**文档坐标**定位、把文档撑高：表现为应用外壳被整体上推、整页可以滚动、
 * 左右两栏在视口中间就被截断（设置页的经典症状）。
 *
 * 因此这里包一层 `relative` 作为它的包含块：既符合 radix 的预期（input 正好压在按钮上），
 * 又不会影响文档高度。上层无需再为「Switch 放进 form」做任何额外处理。
 *
 * 用 `inline-block` 而不是 `inline-flex`：radix 的 `translateX(-100%)` 假设 input 的静态位置
 * 「紧跟在按钮之后」。在 flex 容器里 abspos 子元素的静态位置是内容区起点（不是按钮之后），
 * 反而会偏到左外侧；块状容器里的行内格式上下文才符合这个假设。
 */
function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <span
      data-slot="switch-field"
      className="relative inline-block shrink-0">
      <SwitchPrimitive.Root
        data-slot="switch"
        data-size={size}
        className={cn(
          'peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
          className
        )}
        {...props}>
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            'pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground'
          )}
        />
      </SwitchPrimitive.Root>
    </span>
  )
}

export { Switch }
