import { Button, Space } from 'antd'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'

import { Combobox } from '@/components/combobox/index.ts'
import { MagneticTile } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { OverlayContext } from '@/features/magnetic-tile/overlay-context'
import styles from '@/features/magnetic-tiles/example/workspace/overlay/utility.module.scss'

export default function Utility() {
  const { fullscreen, onUpdateFullscreen } = useContext(OverlayContext)
  const [visible, onUpdateVisible] = useState(false)

  const debounceUpdate = debounce(function () {
    onUpdateVisible(function (prev) {
      return !prev
    })
  }, 1000)

  const visibleRef = useRef(visible)
  useEffect(
    function () {
      visibleRef.current = visible
    },
    [visible]
  )

  const handleCombobox = useCallback(function (event: MouseEvent) {
    if (!visibleRef.current) return
    const target = event.target as HTMLElement
    if (target.closest('.combobox')) return
    onUpdateVisible(function (prev) {
      return !prev
    })
  }, [])

  function onUpdateKeyword(_value: string) {
    debounceUpdate()
  }

  useEffect(
    function () {
      window.addEventListener('click', handleCombobox)
      return function () {
        window.removeEventListener('click', handleCombobox)
      }
    },
    [handleCombobox]
  )

  return (
    <div
      data-region="true"
      onDoubleClick={function () {
        onUpdateFullscreen(!fullscreen)
      }}
      className={clsx([styles.utility, styles.root])}>
      <Space.Compact orientation="horizontal">
        <Button
          data-region="false"
          className={clsx([styles.utility, styles.button])}>
          ☰
        </Button>
      </Space.Compact>
      <Combobox
        visible={visible}
        onUpdate={onUpdateKeyword}
        placeholder="搜索代码文件、符号、设置..."
        className={clsx([styles.utility, styles['combobox-trigger']])}
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
      <MagneticTile.Caption />
    </div>
  )
}
