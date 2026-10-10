import { Button } from '@i-thinking/design/components/button'
import { clsx } from 'clsx'
import { debounce } from 'lodash-es'

import { Combobox } from '@/components/combobox/index.ts'
import styles from '@/views/code/workspace/overlay/utility.module.scss'

export default function Utility() {
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
      className={clsx([styles.utility, styles.root])}>
      <Button
        variant="ghost"
        size="icon"
        data-region="false"
        aria-label="展开侧栏"
        className="rounded-none">
        ☰
      </Button>
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
    </div>
  )
}
