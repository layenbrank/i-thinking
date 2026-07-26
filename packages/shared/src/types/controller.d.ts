// import type { JSX } from 'vue/jsx-runtime'
/// <reference types="vue/jsx-runtime" />

declare namespace MagneticTile {
  // type Reflect = Readonly<
  // 	Partial<Record<MagneticTile.Component, () => import('vue/jsx-runtime').JSX.Element>>
  // >
  type Reflect = Readonly<Partial<Record<MagneticTile.Component, DefineComponent>>>
}
