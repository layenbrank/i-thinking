import { Spin } from 'antd'
import { clsx } from 'clsx'

export default function RouteFallback() {
  return (
    <div
      className={clsx(
        'size-full bg-white dark:bg-black flex items-center justify-center flex-col gap-4'
      )}>
      <Spin size="large" />
      <span>Loading...</span>
    </div>
  )
}
