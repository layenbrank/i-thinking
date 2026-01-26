import { clsx } from 'clsx'
import type { editor } from 'monaco-editor'

import styles from '@/views/code/overlay/section.module.scss'

interface SectionProps {
  composer?: editor.IEditor
}

const Section = forwardRef<HTMLDivElement, SectionProps>(function (props, ref) {
  return (
    <div
      ref={ref}
      id="monacoGraph"
      className={clsx([styles.section, styles.root])}
    />
  )
})

export default Section
