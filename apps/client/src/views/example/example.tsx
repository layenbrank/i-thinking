import { Splitter } from 'antd'
import { clsx } from 'clsx'

import { Overlay } from '@/views/example/overlay/index.ts'

import styles from '@/views/example/example.module.scss'

export default function Example() {
  const [sizes, updateSizes] = useState<(number | string)[]>(['15%', '85%'])

  return (
    <div className={clsx([styles.example, styles.root])}>
      <Overlay.Utility></Overlay.Utility>

      <Splitter onResize={updateSizes}>
        <Splitter.Panel
          min="15%"
          max="30%"
          resizable
          size={sizes[0]}
          className={clsx([styles.example, styles.navigation])}>
          <Overlay.Navigation />
        </Splitter.Panel>
        <Splitter.Panel
          className={clsx([styles.markdown, styles.section])}
          size={sizes[1]}>
          <Overlay.Section />
        </Splitter.Panel>
      </Splitter>

      <Overlay.Summary></Overlay.Summary>
    </div>
  )
}
