import { Spin } from 'antd'

import { ROUTE } from '@/components/fallback/constants.ts'

export default function RouteFallback() {
  return (
    <Spin
      spinning
      fullscreen
      size="large"
      delay={ROUTE.DELAY}
      description={ROUTE.LABEL}
      aria-label={ROUTE.LABEL}
    />
  )
}
