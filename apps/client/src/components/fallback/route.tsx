import { Spin } from 'antd'

export default function RouteFallback() {
  return (
    <div className="w-[100vw] h-[100vh] bg-transparent flex items-center justify-center">
      <Spin
        spinning={true}
        size="small"
      />
    </div>
  )
}
