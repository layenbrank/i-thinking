import { clsx } from 'clsx'

import styles from '@/views/intelligence/overlay/navigation.module.scss'

// interface NavigationProps {
// }

export default function Navigation() {
  return <div className={clsx([styles.navigation, styles.root])}></div>
}
