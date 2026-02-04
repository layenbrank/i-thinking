import { clsx } from 'clsx'

import '@/views/overview/overview.scss'

export default function Overview() {
  return (
    <div className={clsx(['w-[100vw] h-[100vh]'])}>
      <div
        id="titleBarContainer"
        className={clsx(['w-full flex items-center'])}>
        <div className="titlebar-drag-region"></div>
        <div id="titleBar">
          <span
            className={clsx(['window-appicon'])}
            style={{ appRegion: 'drag' } as React.CSSProperties}>
            11
          </span>
          <input type="text" />
        </div>
      </div>
    </div>
  )
}
