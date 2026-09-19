import { Icon } from '@iconify/react/offline'
import { clsx } from 'clsx'
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

import { ENGINE_UI, ENGINES, findEngine } from '@/views/overview/engine/constants'
import { EngineFragment } from '@/views/overview/engine/fragment'
import { useSuggestionQuery, type SuggestionItem } from '@/views/overview/engine/suggestion'
import { readEngineKey, writeEngineKey } from '@/views/overview/engine/store'
import {
  buildMatchUrl,
  findDefaultNavigation,
  findItemUrl,
  isUrlKeyword,
  parseKeywordUrl
} from '@/views/overview/engine/url'

import styles from '@/views/overview/engine/engine.module.scss'

function EngineSearch() {
  const shellRef = useRef<HTMLDivElement>(null)
  const lastNavAt = useRef(0)

  const [keyword, updateKeyword] = useState('')
  const [visible, updateVisible] = useState(false)
  const [menuOpen, updateMenu] = useState(false)
  const [navigation, updateNavigation] = useState<number>(ENGINE_UI.NONE)
  const [engineKey, updateEngineKey] = useState(ENGINES[0].key)

  const engine = findEngine(engineKey)
  const suggestion = useSuggestionQuery(keyword)
  const series = suggestion.items
  const isPanelOpen = visible && !menuOpen && series.length > 0
  const seriesKey = series
    .map(function (item) {
      return item.id
    })
    .join('|')
  const navKey = `${keyword}\0${seriesKey}`
  const [navStamp, updateNavStamp] = useState(navKey)
  if (navStamp !== navKey) {
    updateNavStamp(navKey)
    updateNavigation(keyword ? findDefaultNavigation(keyword) : ENGINE_UI.NONE)
  }

  useEffect(function () {
    let cancelled = false
    void readEngineKey().then(function (key) {
      if (!cancelled) updateEngineKey(key)
    })
    return function () {
      cancelled = true
    }
  }, [])

  useEffect(function () {
    function onPointerDown(event: MouseEvent) {
      const node = shellRef.current
      if (!node) return
      if (event.target instanceof Node && node.contains(event.target)) return
      updateVisible(false)
      updateMenu(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return function () {
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [])

  function changeKeyword(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    updateKeyword(value)
    updateVisible(value.length > 0)
    updateMenu(false)
  }

  function openTarget(url: string) {
    window.open(url)
    updateVisible(false)
  }

  function openItem(item?: SuggestionItem) {
    if (item) {
      openTarget(findItemUrl(engine, item))
      return
    }
    if (!keyword) return
    if (isUrlKeyword(keyword)) {
      openTarget(parseKeywordUrl(keyword))
      return
    }
    openTarget(buildMatchUrl(engine.match, keyword))
  }

  function search() {
    if (isPanelOpen && navigation >= 0) {
      const selected = series[navigation]
      if (selected) {
        openItem(selected)
        return
      }
    }
    openItem()
  }

  function moveNavigation(step: number) {
    const now = Date.now()
    if (now - lastNavAt.current < ENGINE_UI.NAVIGATE_THROTTLE_MS) return
    lastNavAt.current = now
    updateNavigation(function (index) {
      const length = series.length
      if (length <= 0) return index
      const hasNone = isUrlKeyword(keyword)
      const next = index + step
      if (next < 0) return hasNone ? ENGINE_UI.NONE : length - 1
      if (next >= length) return hasNone ? ENGINE_UI.NONE : 0
      return next
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowUp' && isPanelOpen) {
      event.preventDefault()
      moveNavigation(-1)
      return
    }
    if (event.key === 'ArrowDown' && isPanelOpen) {
      event.preventDefault()
      moveNavigation(1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      search()
    }
  }

  function chooseEngine(key: string) {
    updateEngineKey(key)
    updateMenu(false)
    void writeEngineKey(key).catch(function (error) {
      console.warn('[engine] 写不了已选搜索引擎', error)
    })
  }

  return (
    <div
      ref={shellRef}
      className={clsx(styles.shell, isPanelOpen && styles.active)}>
      <button
        type="button"
        className={styles.engine}
        aria-label="搜索引擎"
        aria-expanded={menuOpen}
        title={engine.label}
        onClick={function () {
          updateMenu(function (open) {
            return !open
          })
          updateVisible(false)
        }}>
        <Icon icon={engine.icon} />
      </button>
      <input
        className={styles.field}
        value={keyword}
        placeholder="搜索或输入网址"
        aria-label="搜索"
        onChange={changeKeyword}
        onKeyDown={onKeyDown}
        onFocus={function () {
          if (keyword) updateVisible(true)
        }}
      />
      <button
        type="button"
        className={styles.submit}
        aria-label="搜索"
        onClick={search}>
        <Icon icon="mdi:magnify" />
      </button>
      {menuOpen ? (
        <div className={styles.menu}>
          {ENGINES.map(function (item) {
            const isActive = item.key === engine.key
            return (
              <button
                key={item.key}
                type="button"
                className={clsx(styles.menuItem, isActive && styles.menuItemActive)}
                onClick={function () {
                  chooseEngine(item.key)
                }}>
                <Icon icon={item.icon} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
      {isPanelOpen ? (
        <EngineFragment
          series={series}
          navigation={navigation}
          onSelect={openItem}
          onNavigate={updateNavigation}
        />
      ) : null}
    </div>
  )
}

export { EngineSearch }
