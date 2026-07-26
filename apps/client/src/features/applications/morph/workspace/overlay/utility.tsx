import { Button } from 'antd'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'

import { Combobox } from '@/components/combobox/index.ts'
import { Application } from '@/features/application/application.tsx'
import { OverlayContext } from '@/features/application/overlay-context'
import styles from '@/features/applications/morph/workspace/overlay/utility.module.scss'
import { useMorphStore } from '@/stores/morph.ts'

export default function Utility() {
  const { fullscreen, onUpdateFullscreen } = useContext(OverlayContext)
  const [visible, onUpdateVisible] = useState(false)
  const searchText = useMorphStore(function (s) {
    return s.searchText
  })
  const fileName = useMorphStore(function (s) {
    return s.file?.path.split(/[\\/]/).pop() ?? ''
  })

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
    const closest = target.closest('.combobox')
    if (closest) return
    onUpdateVisible(function (prev) {
      return !prev
    })
  }, [])

  async function onUpdateKeyword(value: string) {
    if (value.trim()) await searchText(value)
    debounceUpdate()
  }

  useEffect(function () {
    window.addEventListener('click', handleCombobox)
    return function () {
      window.removeEventListener('click', handleCombobox)
    }
  }, [handleCombobox])

  return (
    <div
      data-region="true"
      onDoubleClick={function () {
        onUpdateFullscreen(!fullscreen)
      }}
      className={clsx([styles.utility, styles.root])}>
      <div className={styles.leftGroup}>
        <Button
          data-region="false"
          className={clsx([styles.utility, styles.button])}>
          ☰
        </Button>
        <span className={styles.appLogo}>P</span>
        <span className={styles.appName}>PDF morph</span>
        {fileName ? <span className={styles.fileName}>{fileName}</span> : null}
      </div>

      <Combobox
        visible={visible}
        onUpdate={onUpdateKeyword}
        placeholder="搜索文字内容 / 页码 / 批注..."
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

      <Application.Caption />
    </div>
  )
}
