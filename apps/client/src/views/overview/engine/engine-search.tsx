/**
 * Overview 顶栏搜索：建议请求、键盘导航、面板显隐
 */
import { Input } from 'antd'
import { clsx } from 'clsx'
import { AnimatePresence } from 'motion/react'
import { useClickOutside } from '@reactuses/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { debounce, throttle } from 'lodash-es'
import { useEffect, useMemo, useRef, useState } from 'react'

import { EngineIpc } from '@/lib/engine-ipc'
import { ENGINE_UI } from '@/views/overview/engine/engine-constants'
import { EngineFragment } from '@/views/overview/engine/engine-fragment'
import {
  buildMatchUrl,
  buildSuggestionUrl,
  findDefaultNavigation,
  isUrlKeyword,
  parseKeywordUrl
} from '@/views/overview/engine/engine-url'
import styles from '@/views/overview/overview.module.scss'

function EngineSearch() {
  const engineRef = useRef<HTMLDivElement>(null)
  const keywordRef = useRef('')
  const querySeq = useRef(0)

  const [keyword, setKeyword] = useState('')
  const [matchedKeyword, setMatchedKeyword] = useState('')
  const [visible, setVisible] = useState(false)
  const [series, setSeries] = useState<Engine.Item[]>([])
  const [navigation, setNavigation] = useState<number>(ENGINE_UI.NONE)

  const fetchSuggestion = useMemo(function () {
    return debounce(function (value: string) {
      if (!value) {
        setSeries([])
        setMatchedKeyword('')
        setNavigation(ENGINE_UI.NONE)
        return
      }

      const seq = ++querySeq.current

      EngineIpc.suggestion(value)
        .then(function (data) {
          if (seq !== querySeq.current) return
          if (value !== keywordRef.current) return
          setSeries(data.s ?? [])
          setMatchedKeyword(value)
          setNavigation(findDefaultNavigation(value))
        })
        .catch(function (error) {
          if (seq !== querySeq.current) return
          if (value !== keywordRef.current) return
          console.error('[engine] suggestion failed:', error)
          setSeries([])
          setMatchedKeyword('')
          setNavigation(ENGINE_UI.NONE)
        })
    }, 300)
  }, [])

  useEffect(
    function () {
      return function () {
        fetchSuggestion.cancel()
      }
    },
    [fetchSuggestion]
  )

  useClickOutside(engineRef, function () {
    setVisible(false)
  })

  const isSeriesFresh = matchedKeyword === keyword && series.length > 0
  const isPanelOpen = visible && keyword.length > 0 && isSeriesFresh

  function changeKeyword(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    keywordRef.current = value
    setKeyword(value)
    setVisible(value.length > 0)

    if (!value) {
      querySeq.current += 1
      fetchSuggestion.cancel()
      setSeries([])
      setMatchedKeyword('')
      setNavigation(ENGINE_UI.NONE)
      return
    }

    fetchSuggestion(value)
  }

  function openEngine() {
    if (keyword) setVisible(true)
  }

  function openItemUrl(item?: Engine.Item) {
    if (item) {
      void openUrl(buildSuggestionUrl(item.u))
      return
    }
    if (!keyword) return
    if (isUrlKeyword(keyword)) {
      void openUrl(parseKeywordUrl(keyword))
      return
    }
    void openUrl(buildMatchUrl(keyword))
  }

  function search() {
    if (isPanelOpen && navigation >= 0) {
      const selected = series[navigation]
      if (selected) {
        openItemUrl(selected)
        return
      }
    }
    openItemUrl()
  }

  const seriesLengthRef = useRef(series.length)
  seriesLengthRef.current = series.length

  const navigatePrev = useMemo(function () {
    return throttle(
      function () {
        setNavigation(function (index) {
          const length = seriesLengthRef.current
          if (length <= 0) return index
          const hasNone = isUrlKeyword(keywordRef.current)
          if (index < 0) return length - 1
          if (index <= 0) return hasNone ? ENGINE_UI.NONE : length - 1
          return index - 1
        })
      },
      ENGINE_UI.NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  const navigateNext = useMemo(function () {
    return throttle(
      function () {
        setNavigation(function (index) {
          const length = seriesLengthRef.current
          if (length <= 0) return index
          const hasNone = isUrlKeyword(keywordRef.current)
          if (index < 0) return 0
          if (index >= length - 1) return hasNone ? ENGINE_UI.NONE : 0
          return index + 1
        })
      },
      ENGINE_UI.NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  useEffect(
    function () {
      return function () {
        navigatePrev.cancel()
        navigateNext.cancel()
      }
    },
    [navigatePrev, navigateNext]
  )

  const keyHandlers: Record<string, (e: React.KeyboardEvent<HTMLInputElement>) => void> = {
    ArrowUp(e) {
      if (!isPanelOpen) return
      e.preventDefault()
      navigatePrev()
    },
    ArrowDown(e) {
      if (!isPanelOpen) return
      e.preventDefault()
      navigateNext()
    },
    Enter(e) {
      e.preventDefault()
      search()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    keyHandlers[e.key]?.(e)
  }

  return (
    <div
      ref={engineRef}
      onClick={openEngine}
      className={clsx(styles.engine, styles.section, {
        [styles.active]: isPanelOpen
      })}>
      <Input.Search
        value={keyword}
        onChange={changeKeyword}
        onSearch={search}
        onKeyDown={onKeyDown}
        classNames={{
          root: clsx(styles.engine, styles.keyword),
          input: clsx(styles.engine, styles.trigger),
          button: {
            root: clsx(styles.engine, styles.series),
            icon: clsx(styles.engine, styles.mark)
          }
        }}
      />
      <AnimatePresence>
        {isPanelOpen && (
          <EngineFragment
            series={series}
            navigation={navigation}
            onSelect={openItemUrl}
            onNavigate={setNavigation}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export { EngineSearch }
