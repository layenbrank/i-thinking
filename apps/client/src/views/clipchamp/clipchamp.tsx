import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'

export default function Clipchamp() {
  return (
    <WindowFrame title={findComponentLabel('clipchamp')}>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        视频
      </div>
    </WindowFrame>
  )
}
