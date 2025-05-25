import type { JSX } from 'vue/jsx-runtime'
import type { SlideAppName } from './slide-app'

export type AppReflect = Readonly<Record<SlideAppName, () => JSX.Element>>
