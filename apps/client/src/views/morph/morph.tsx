import { clsx } from 'clsx'

import styles from '@/views/morph/morph.module.scss'
import './morph.scss'

export default function Morph() {
  const [sizes, updateSizes] = useState<(number | string)[]>(['15%', '85%'])

  return <div className={clsx([styles.morph, styles.root])}></div>
}
