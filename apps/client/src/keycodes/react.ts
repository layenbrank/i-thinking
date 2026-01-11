import { useEffect, useLayoutEffect, useRef } from 'react'

import {
  registerKeyCodeHandler,
  type RegisterKeyCodeHandlerOptions
} from '@/keycodes/dispatcher'
import type { KeyCodeID } from '@/keycodes/types'

export function useKeyCode(
  id: KeyCodeID,
  handler: () => boolean | void | Promise<boolean | void>,
  options?: RegisterKeyCodeHandlerOptions
) {
  const handlerRef = useRef(handler)

  // ✅ 不要在 render 里写 ref.current；放到（layout）effect 里同步
  useLayoutEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    // 这里读 ref.current 是在 effect/事件回调里，允许
    return registerKeyCodeHandler(id, () => handlerRef.current(), options)
  }, [id, options])
}
