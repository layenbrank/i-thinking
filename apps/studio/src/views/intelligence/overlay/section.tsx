import { clsx } from 'clsx'
import type { editor } from 'monaco-editor'

import styles from '@/views/intelligence/overlay/section.module.scss'

interface SectionProps {
  composer?: editor.IEditor
}

function Section(props: SectionProps) {
  return <div className={clsx([styles.section, styles.root])} />
}

export default Section
