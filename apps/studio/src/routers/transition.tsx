import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Suspense } from 'react'
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom'

import { Fallback } from '@/components/fallback/index.ts'

/**
 * 路由切换的进场动效（挂在无路径布局路由上，见 `index.ts`）。
 *
 * 按 `pathname` 换 key → 新页面挂载即播一次「按导航方向滑入 + 淡入」：
 * 前进（PUSH，如 `/agent/chat` → `/agent/settings`）从右侧进，返回（POP）从左侧进 ——
 * 这样才读得出「换页了」，纯淡入太容易被当成刷新。
 *
 * **不做退场**：退场要 `AnimatePresence` 把旧节点留在树上等动画播完（`mode="wait"` 还得等它结束
 * 才挂新页面），而 motion 的动画靠 rAF 推进 —— 窗口被遮挡 / 最小化时 rAF 会暂停，
 * 那时切路由会把**新页面卡住不挂载**（实测：URL 已变、DOM 还停在旧页）。风险不值当。
 *
 * 懒加载页面在 chunk 到位前会 suspend：占位由这里的 `<Suspense>` 接住（`Fallback.Route` 延迟才显），
 * 这样首次进页面也能播进场 —— 否则挂在外层 App 上的 Suspense 会把整棵树换掉，动画就没了。
 *
 * `initial={false}` 只关掉「窗口刚打开那一次」的动画：启动时页面应该直接就是亮的。
 * 时长刻意短（~0.2s）：切页面要跟手，不是给人看动画。
 * `prefers-reduced-motion` 下只留淡入，不做位移。
 */
function RouteTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const navigationType = useNavigationType()
  const isReducedMotion = useReducedMotion()
  const direction = navigationType === 'POP' ? -1 : 1
  const distance = isReducedMotion ? 0 : 24 * direction

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.pathname}
        className="h-full w-full"
        initial={{ opacity: 0, x: distance }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}>
        <Suspense fallback={<Fallback.Route />}>{outlet}</Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export { RouteTransition }
