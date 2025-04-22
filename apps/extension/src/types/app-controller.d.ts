import type { JSX } from 'vue/jsx-runtime'

export type AppReflect = Readonly<Record<string, () => JSX.Element>>
