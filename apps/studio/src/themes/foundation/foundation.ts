import type { ThemeToken } from '@/themes/antd'

import { PRIMARY_COLOR } from '@/themes/foundation/palette'

export const FOUNDATION: ThemeToken = {
  colorPrimary: PRIMARY_COLOR,
  borderRadius: 6,
  fontSize: 14
}

export interface SeedPatch {
  color: string
  radius: number
  fontSize: number
}

export function mergeSeed(base: ThemeToken, patch: SeedPatch): ThemeToken {
  return {
    ...base,
    colorPrimary: patch.color,
    borderRadius: patch.radius,
    fontSize: patch.fontSize
  }
}
