import type { SlideApp } from './slide-app'

export interface SlideWindow {
  id: string
  title: string
  type: string
  icon: string
  slideApps: SlideApp
}
