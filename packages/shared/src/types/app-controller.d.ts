import type { JSX } from 'vue/jsx-runtime'

export type ApplicationReflect = Readonly<Partial<Record<ApplicationName, () => JSX.Element>>>
