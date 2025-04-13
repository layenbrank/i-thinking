export type SlideAppDialog = ReturnType<(typeof import('ant-design-vue'))['Modal']['info']>

export type SlideAppSize = 'mini' | 'small' | 'medium' | 'large' | 'huge' | 'massive' | 'ultra'

export type SlideAppDirection = 'horizontal' | 'vertical'

export type SlideAppShape = 'square' | 'circle' | 'rectangle'

export interface SlideApp {
  width: string | null
  height: string | null
  round: string | null
  textSize: string | null
  textColor: string | null
  backgroundColor: string | null
  backgroundImage: string | null
  id: string
  slideID: string
  app: string
  size: SlideAppSize
  name: string
  url?: string
  icon?: string
  direction: SlideAppDirection
  shape: SlideAppShape
  description: string
  downloadCount: number
}
