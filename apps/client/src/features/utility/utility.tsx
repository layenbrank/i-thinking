import { Space } from 'antd'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'
import type { ReactNode } from 'react'
import { useClickOutside } from '@reactuses/core'

import { Combobox } from '@/components/combobox/index.ts'
import { Application } from '@/features/application/application.tsx'
import { OverlayContext } from '@/features/application/overlay-context'
import styles from '@/features/utility/utility.module.scss'

interface UtilityProps {
  prefix?: ReactNode
  section?: ReactNode
  /** 应用扩展操作（Caption 左侧）；兼容旧 suffix */
  actions?: ReactNode
  suffix?: ReactNode
  wait?: number
  visible: boolean
  onUpdateVisible: (visible: boolean) => void
  onUpdateKeyword: (keyword: string) => void
}

export default function Utility(props: UtilityProps) {
  const { fullscreen, onUpdateFullscreen } = useContext(OverlayContext)
  const ComboboxRef = useRef<HTMLDivElement>(null)

  const debounceUpdate = useMemo(
    function () {
      return debounce(function (next: boolean) {
        props.onUpdateVisible(next)
      }, props.wait ?? 0)
    },
    [props.wait, props.onUpdateVisible]
  )

  useClickOutside(ComboboxRef, function () {
    props.onUpdateVisible(false)
  })

  function onUpdateKeyword(value: string) {
    props.onUpdateKeyword(value)
    debounceUpdate(!props.visible)
  }

  function onToggleFullscreen() {
    onUpdateFullscreen(!fullscreen)
  }

  const extension = props.actions ?? props.suffix

  return (
    <div
      data-region="true"
      onDoubleClick={onToggleFullscreen}
      className={clsx([styles.utility])}>
      {props.prefix !== undefined ? (
        props.prefix
      ) : (
        <Space.Compact orientation="horizontal">
          <i className="placeholder"></i>
        </Space.Compact>
      )}
      {props.section !== undefined ? (
        props.section
      ) : (
        <Combobox
          ref={ComboboxRef}
          visible={props.visible}
          onUpdate={onUpdateKeyword}
          placeholder="输入关键词..."
          className={clsx([styles['combobox-trigger']])}
          section={
            <Combobox.Series
              options={Array.from({ length: 60 }).map(function (_, index) {
                return {
                  label: `搜索结果项 ${index + 1}`,
                  value: `result-${index + 1}`,
                  key: `result-${index + 1}`
                }
              })}
            />
          }
        />
      )}
      <Application.Caption actions={extension} />
    </div>
  )
}

export type { UtilityProps }
