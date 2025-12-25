// import type { JSX } from 'vue/jsx-runtime'
/// <reference types="vue/jsx-runtime" />

declare namespace Application {
  // type Reflect = Readonly<
  // 	Partial<Record<Application.Component, () => import('vue/jsx-runtime').JSX.Element>>
  // >
  type Reflect = Readonly<Partial<Record<Application.Component, DefineComponent>>>
}
