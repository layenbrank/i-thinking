import { useEffect, useState } from 'react'

import { findWallCols } from '@/views/directive/render/card-size'

/**
 * 墙面网格列数：跟 `sm/xl/2xl` 断点走，给分组壳估高用。
 * 用 `innerWidth` 近似内容宽（差在左右 padding，估高宁稍高）。
 */

function useWallCols(): number {
  const [cols, updateCols] = useState(function () {
    if (typeof window === 'undefined') return 2
    return findWallCols(window.innerWidth)
  })

  useEffect(function () {
    function sync() {
      updateCols(findWallCols(window.innerWidth))
    }

    sync()
    window.addEventListener('resize', sync)
    return function () {
      window.removeEventListener('resize', sync)
    }
  }, [])

  return cols
}

export { useWallCols }
