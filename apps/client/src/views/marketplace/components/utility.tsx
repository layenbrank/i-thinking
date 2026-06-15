import { Icon } from '@iconify/react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Button, Space, Tooltip } from 'antd'
import type { TooltipPlacement } from 'antd/es/tooltip'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'
import type { ReactNode } from 'react'

import { Combobox } from '@/components/combobox/index.ts'
import styles from '@/features/utility/utility.module.scss'

interface Option {
  mark: ReactNode
  key: string
  tooltip: string
  placement: TooltipPlacement
  event: () => void
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

export default function Utility() {
  const location = useLocation()

  const [visible, onUpdateVisible] = useState(false)

  const debounceUpdate = debounce(function () {
    onUpdateVisible(function (prev) {
      return !prev
    })
    console.log('搜索框可见性切换为:', !visible)
  }, 1000)

  const visibleRef = useRef(visible)
  useEffect(
    function () {
      visibleRef.current = visible
    },
    [visible]
  )

  const handleCombobox = useCallback(
    function (event: MouseEvent) {
      if (!visibleRef.current) return
      const target = event.target as HTMLElement
      const closest = target.closest('.combobox')
      if (closest) return
      onUpdateVisible(function (prev) {
        return !prev
      })
      console.log('点击了搜索框:', event)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function onUpdateKeyword(value: string) {
    console.log('搜索关键词更新为:', value)
    debounceUpdate()
  }

  function onMaximizable() {
    void getCurrentWindow().toggleMaximize()
  }

  function onTeleport() {
    return document.body
  }

  useEffect(function () {
    window.addEventListener('click', handleCombobox)

    console.log('location', location)

    return function () {
      window.removeEventListener('click', handleCombobox)
    }
    // 只在组件挂载/卸载时绑定一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-region="true"
      onDoubleClick={onMaximizable}
      className={clsx([styles.utility])}>
      <Space.Compact orientation="horizontal">
        <Button
          data-region="false"
          className={clsx([styles.button])}></Button>
      </Space.Compact>
      {!EXCLUDES.includes(location.pathname) && (
        <Combobox
          visible={visible}
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
    </div>
  )
}
