import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'

export default function Bookmark() {
  return (
    <WindowFrame title={findComponentLabel('bookmark')}>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        书签
      </div>
    </WindowFrame>
  )
}
