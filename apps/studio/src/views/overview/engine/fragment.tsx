import { Icon } from '@iconify/react/offline'
import { clsx } from 'clsx'

import { parseSuggestionLabel } from '@/views/overview/engine/url'

import styles from '@/views/overview/engine/engine.module.scss'

interface SuggestionItem {
  id: string
  q: string
  u: string
  t: string
}

interface EngineFragmentProps {
  series: SuggestionItem[]
  navigation: number
  onSelect: (item: SuggestionItem) => void
  onNavigate: (index: number) => void
}

function EngineFragment(props: EngineFragmentProps) {
  const { series, navigation, onSelect, onNavigate } = props

  return (
    <div
      className={styles.fragment}
      role="listbox">
      {series.map(function (item, index) {
        const isActive = index === navigation
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            className={clsx(styles.option, isActive && styles.optionActive)}
            onMouseEnter={function () {
              onNavigate(index)
            }}
            onMouseDown={function (event) {
              event.preventDefault()
            }}
            onClick={function () {
              onSelect(item)
            }}>
            <span>{parseSuggestionLabel(item.q)}</span>
            <Icon
              icon="mdi:arrow-top-left"
              className={clsx(styles.mark, isActive && styles.markActive)}
            />
          </button>
        )
      })}
    </div>
  )
}

export type { SuggestionItem }
export { EngineFragment }
