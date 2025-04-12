export {}

declare global {
  export type AppDialog = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>

  export type AppSize = 'mini' | 'small' | 'medium' | 'large' | 'huge' | 'massive' | 'ultra'

  export type AppDirection = 'horizontal' | 'vertical'

  export type AppShape = 'square' | 'circle' | 'rectangle'

  export interface AppWindow {
    id: string
    title: string
    type: string
  }

  export interface AppOptions {
    width: string | null
    height: string | null
    round: string | null
    textSize: string | null
    textColor: string | null
    backgroundColor: string | null
    backgroundImage: string | null
    id: string
    app: string
    size: AppSize
    name: string
    url?: string
    icon?: string
    direction: AppDirection
    shape: AppShape
    description: string
    downloadCount: number
  }
}
