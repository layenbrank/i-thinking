import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'

export default function Gallery() {
  return (
    <WindowFrame title={findComponentLabel('gallery')}>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        图库
      </div>
    </WindowFrame>
  )
}
