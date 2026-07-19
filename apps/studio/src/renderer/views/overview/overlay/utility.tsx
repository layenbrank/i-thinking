import { clsx } from 'clsx'
import { Icon } from '@iconify/react'
import type { TooltipPlacement } from 'antd/es/tooltip'
import type { ReactNode } from 'react'
import { Button, Space, Tooltip } from 'antd'
import { debounce } from 'lodash-es'

import { Combobox } from '@/components/combobox/index.ts'
import styles from '@/views/overview/overlay/utility.module.scss'

interface Option {
  mark: ReactNode
  key: string
  tooltip: string
  placement: TooltipPlacement
  event: () => void
}

const SuffixOptions: Option[] = [
  {
    mark: <Icon icon="custom:minimize-12-filled" />,
    key: '最小化',
    tooltip: '最小化窗口',
    placement: 'bottom',
    event() {}
  },
  {
    mark: <Icon icon="custom:maximize-24-filled" />,
    key: '最大化',
    tooltip: '最大化窗口',
    placement: 'bottom',
    event() {}
  },
  {
    mark: <Icon icon="custom:close-fill" />,
    key: '关闭',
    tooltip: '关闭窗口',
    placement: 'bottomRight',
    event() {}
  }
]

export default function Utility() {
  const [visible, onUpdateVisible] = useState(false)

  function handleDevtools() {
    void window.studio.devtools.updateVisible({ visible: true })
  }

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

  function onMaximizable(event: React.MouseEvent<HTMLDivElement>) {}

  function onTeleport() {
    return document.body
  }

  useEffect(function () {
    window.addEventListener('click', handleCombobox)
    return function () {
      window.removeEventListener('click', handleCombobox)
    }
    // 只在组件挂载/卸载时绑定一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onDoubleClick={onMaximizable}
      className={clsx([styles.utility, styles.root])}>
      <Space.Compact
        orientation="horizontal"
        rootClassName={clsx([styles.utility, styles.begin])}>
        <Button
          onClick={handleDevtools}
          className={clsx([styles.utility, styles.button])}>
          ☰
        </Button>
      </Space.Compact>
      <div className={clsx([styles.utility, styles.center])}>
        <Combobox
          visible={visible}
          onUpdate={onUpdateKeyword}
          placeholder="搜索代码文件、符号、设置..."
          className={clsx([styles.utility, styles['combobox-trigger']])}
          section={
            <Combobox.Collection
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
      </div>
      <div className={clsx([styles.utility, styles.final])}></div>
      <div className={clsx([styles.draggable, styles.region])}></div>
    </div>
  )
}
