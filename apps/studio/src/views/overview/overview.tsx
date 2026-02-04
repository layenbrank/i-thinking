import { clsx } from 'clsx'

import '@/views/overview/overview.scss'

export default function Overview() {
  return (
    <div className={clsx(['size-full'])}>
      <div
        id="titlebar"
        className={clsx(['w-full h-[35px] bg-red-300'])}>
        <div className="titlebar-drag-region"></div>
        <div>
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
