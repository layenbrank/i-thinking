import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'

export default function Signboard() {
  return (
    <WindowFrame title={findComponentLabel('signboard')}>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        看板
      </div>
    </WindowFrame>
  )
}
