export {}

declare global {
  export type AppWindowType = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>

  export type AppSize = 'mini' | 'small' | 'middle' | 'large' | 'huge'
}
