import { Icon } from '@iconify/react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Button, Space, Tooltip } from 'antd'
import type { TooltipPlacement } from 'antd/es/tooltip'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'
import type { ReactNode } from 'react'
import { useClickOutside } from '@reactuses/core'

import { Combobox } from '@/components/combobox/index.ts'
import styles from '@/features/utility/utility.module.scss'

interface Option {
  mark: ReactNode
  key: string
  tooltip: string
  placement: TooltipPlacement
  event: () => void
}

interface UtilityProps {
  prefix?: ReactNode
  section?: ReactNode
  suffix?: ReactNode
  wait?: number
  visible: boolean
  onUpdateVisible: (visible: boolean) => void

  onUpdateKeyword: (keyword: string) => void
}

const EXCLUDES = ['/marketplace/customize']

const SUFFIX: Option[] = [
  {
    mark: <Icon icon="custom:minimize-12-filled" />,
    key: 'minimize',
    tooltip: '最小化窗口',
    placement: 'bottom',
    event() {
      void getCurrentWindow().minimize()
    }
  },
  {
    mark: <Icon icon="custom:maximize-24-filled" />,
    key: 'maximize',
    tooltip: '最大化窗口',
    placement: 'bottom',
    event() {
      void getCurrentWindow().toggleMaximize()
    }
  },
  {
    mark: <Icon icon="custom:close-fill" />,
    key: 'destroy',
    tooltip: '关闭窗口',
    placement: 'bottomRight',
    event() {
      void getCurrentWindow().close()
    }
  }
]

export default function (props: UtilityProps) {
  const location = useLocation()
  const ComboboxRef = useRef<HTMLDivElement>(null)

  const debounceUpdate = useMemo(
    function () {
      return debounce(function (next: boolean) {
        props.onUpdateVisible(next)
      }, props.wait ?? 0)
    },
    [props.wait]
  )

  useClickOutside(ComboboxRef, function () {
    props.onUpdateVisible(false)
  })

  function onUpdateKeyword(value: string) {
    console.log('搜索关键词更新为:', value)
    props.onUpdateKeyword(value)
    debounceUpdate(!props.visible)
  }

  function onMaximizable() {
    void getCurrentWindow().toggleMaximize()
  }

  function onTeleport() {
    return document.body
  }

  useEffect(function () {
    console.log('location', location)
  }, [])

  return (
    <div
      data-region="true"
      onDoubleClick={onMaximizable}
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
      {props.suffix !== undefined ? (
        props.suffix
      ) : (
        <Space.Compact
          orientation="horizontal"
          rootClassName={styles['space-region']}>
          {SUFFIX.map(function (option) {
            return (
              <Tooltip
                arrow={true}
                key={option.key}
                title={option.tooltip}
                autoAdjustOverflow={true}
                placement={option.placement}
                getPopupContainer={onTeleport}
                getTooltipContainer={onTeleport}>
                <Button
                  data-region="false"
                  onClick={option.event}
                  className={clsx([styles.button, styles[option.key]])}>
                  {option.mark}
                </Button>
              </Tooltip>
            )
          })}
        </Space.Compact>
      )}
    </div>
  )
}
