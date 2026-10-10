import { WindowFrame } from '@/components/window-frame/index.ts'
import Shell from '@/views/settings/shell.tsx'

/** 设置磁贴窗口：Shell 自带侧栏与滚动区，外壳只负责窗口装饰与圆角卡片 */
export default function Settings() {
  return (
    <WindowFrame isScrollable={false}>
      <Shell />
    </WindowFrame>
  )
}
