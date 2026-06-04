import { Spin } from 'antd'
import { clsx } from 'clsx'

export default function RouteFallback() {
  return (
    <div
      className={clsx(
        'w-[100vw] h-[100vh] bg-white dark:bg-black flex items-center justify-center flex-col gap-4'
      )}>
      <Spin
        spinning={true}
        size="large"
      />
      <span>Loading...</span>
    </div>
  )
}
