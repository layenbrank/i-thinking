import { createContext } from 'react'

interface OverlayContextProps {
  visible: boolean
  renderable: boolean
  fullscreen: boolean
  onUpdateVisible: (value: boolean) => void
  onUpdateRenderable: (value: boolean) => void
  onUpdateFullscreen: (value: boolean) => void
}

const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  renderable: false,
  fullscreen: false,
  onUpdateVisible: function (value) {
    void value
  },
  onUpdateRenderable: function (value) {
    void value
  },
  onUpdateFullscreen: function (value) {
    void value
  }
})

export type { OverlayContextProps }
export { OverlayContext }
