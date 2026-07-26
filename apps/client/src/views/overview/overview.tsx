import { Input, Layout as Payload, FloatButton } from 'antd'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useClickOutside } from '@reactuses/core'
import { Icon } from '@iconify/react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { debounce, throttle } from 'lodash-es'

import ReSignIn from '@/features/signin/signin.tsx'
import Controller from '@/features/controller/controller.tsx'
import { EngineIpc } from '@/lib/engine-ipc'
import {
  bindFragmentScroll,
  createIndicatorDriver,
  SCROLL_DURATION,
  type FragmentScrollSession,
  type IndicatorDriver
} from '@/lib/gsap-fragment'
import { ENGINE } from '@/constants/engine.ts'
import styles from '@/views/overview/overview.module.scss'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

const FRAGMENT = {
  PRIVATE_USE_CHARS: /[\uE000-\uF8FF]/g,
  // http(s)、localhost、www / 域名（可带端口与路径）
  URL_PATTERN:
    /^(?:https?:\/\/)?(?:localhost|(?:[\w-]+\.)+[a-z]{2,})(?::\d{1,5})?(?:[/?#][^\s]*)?$/i,
  SCROLL_PAD: 8,
  NAVIGATE_THROTTLE_MS: 150,
  NONE: -1,
  LIST_VARIANTS: {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.022,
        delayChildren: 0.03
      }
    }
  },
  ITEM_VARIANTS: {
    hidden: {
      opacity: 0,
      y: 8
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
      }
    }
  }
} as const

function parseSuggestionLabel(q: string) {
  return q.replace(FRAGMENT.PRIVATE_USE_CHARS, '')
}

function isUrlKeyword(value: string) {
  const text = value.trim()
  if (!text || /\s/.test(text)) return false
  return FRAGMENT.URL_PATTERN.test(text)
}

function parseKeywordUrl(value: string) {
  const text = value.trim()
  if (/^https?:\/\//i.test(text)) return text
  return `https://${text}`
}

function buildSuggestionUrl(u: string) {
  return `${ENGINE.ORIGIN.value}/${u}`
}

function buildMatchUrl(keyword: string) {
  return `${ENGINE.ORIGIN.value}/search?q=${encodeURIComponent(keyword)}`
}

function findDefaultNavigation(value: string) {
  return isUrlKeyword(value) ? FRAGMENT.NONE : 0
}

export default function Overview() {
  const engineRef = useRef<HTMLDivElement>(null)
  const keywordRef = useRef('')
  const querySeq = useRef(0)

  const [keyword, onUpdateKeyword] = useState<string>('')
  const [matchedKeyword, onUpdateMatchedKeyword] = useState('')
  const [visible, onUpdateVisible] = useState<boolean>(false)
  const [series, onUpdateSeries] = useState<Engine.Item[]>([])
  const [navigation, onUpdateNavigation] = useState<number>(FRAGMENT.NONE)
  const [signinOpen, setSigninOpen] = useState(false)

  const fetchSuggestion = useMemo(function () {
    return debounce(function (value: string) {
      if (!value) {
        onUpdateSeries([])
        onUpdateMatchedKeyword('')
        onUpdateNavigation(FRAGMENT.NONE)
        return
      }

      const seq = ++querySeq.current

      EngineIpc.suggestion(value)
        .then(function (data) {
          if (seq !== querySeq.current) return
          if (value !== keywordRef.current) return
          onUpdateSeries(data.s ?? [])
          onUpdateMatchedKeyword(value)
          onUpdateNavigation(findDefaultNavigation(value))
        })
        .catch(function (error) {
          if (seq !== querySeq.current) return
          if (value !== keywordRef.current) return
          console.error('[engine] suggestion failed:', error)
          onUpdateSeries([])
          onUpdateMatchedKeyword('')
          onUpdateNavigation(FRAGMENT.NONE)
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
    onUpdateVisible(false)
  })

  const isSeriesFresh = matchedKeyword === keyword && series.length > 0
  const isPanelOpen = visible && keyword.length > 0 && isSeriesFresh

  function onChangeKeyword(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    keywordRef.current = value
    onUpdateKeyword(value)
    onUpdateVisible(value.length > 0)

    if (!value) {
      querySeq.current += 1
      fetchSuggestion.cancel()
      onUpdateSeries([])
      onUpdateMatchedKeyword('')
      onUpdateNavigation(FRAGMENT.NONE)
      return
    }

    fetchSuggestion(value)
  }

  function onOpenSignin() {
    setSigninOpen(true)
  }

  function onCloseSignin() {
    setSigninOpen(false)
  }

  function onEngineClick() {
    if (keyword) {
      onUpdateVisible(true)
    }
  }

  function onOpenUrl(item?: Engine.Item) {
    if (item) {
      openUrl(buildSuggestionUrl(item.u))
      return
    }
    if (!keyword) return
    if (isUrlKeyword(keyword)) {
      openUrl(parseKeywordUrl(keyword))
      return
    }
    openUrl(buildMatchUrl(keyword))
  }

  function onSearch() {
    if (isPanelOpen && navigation >= 0) {
      const selected = series[navigation]
      if (selected) {
        onOpenUrl(selected)
        return
      }
    }
    onOpenUrl()
  }

  const seriesLengthRef = useRef(series.length)
  seriesLengthRef.current = series.length

  const onNavigatePrev = useMemo(function () {
    return throttle(
      function () {
        onUpdateNavigation(function (index) {
          const length = seriesLengthRef.current
          if (length <= 0) return index
          const hasNone = isUrlKeyword(keywordRef.current)
          if (index < 0) return length - 1
          if (index <= 0) return hasNone ? FRAGMENT.NONE : length - 1
          return index - 1
        })
      },
      FRAGMENT.NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  const onNavigateNext = useMemo(function () {
    return throttle(
      function () {
        onUpdateNavigation(function (index) {
          const length = seriesLengthRef.current
          if (length <= 0) return index
          const hasNone = isUrlKeyword(keywordRef.current)
          if (index < 0) return 0
          if (index >= length - 1) return hasNone ? FRAGMENT.NONE : 0
          return index + 1
        })
      },
      FRAGMENT.NAVIGATE_THROTTLE_MS,
      { leading: true, trailing: false }
    )
  }, [])

  useEffect(
    function () {
      return function () {
        onNavigatePrev.cancel()
        onNavigateNext.cancel()
      }
    },
    [onNavigatePrev, onNavigateNext]
  )

  const KEY_HANDLERS: Record<string, (e: React.KeyboardEvent<HTMLInputElement>) => void> = {
    ArrowUp: function (e) {
      if (!isPanelOpen) return
      e.preventDefault()
      onNavigatePrev()
    },
    ArrowDown: function (e) {
      if (!isPanelOpen) return
      e.preventDefault()
      onNavigateNext()
    },
    Enter: function (e) {
      e.preventDefault()
      onSearch()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    KEY_HANDLERS[e.key]?.(e)
  }

  return (
    <Payload className={clsx(styles.overview, styles.payload)}>
      <Prefix className={clsx(styles.overview, styles.prefix)}>
        <div
          ref={engineRef}
          onClick={onEngineClick}
          className={clsx(styles.engine, styles.section, {
            [styles.active]: isPanelOpen
          })}>
          <Input.Search
            value={keyword}
            onChange={onChangeKeyword}
            onSearch={onSearch}
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
              <ReFragment
                series={series}
                navigation={navigation}
                onSelect={onOpenUrl}
                onNavigate={onUpdateNavigation}
              />
            )}
          </AnimatePresence>
        </div>
      </Prefix>
      <Core className={clsx(styles.overview, styles.core)}>
        <Controller.Mirror>
          <Controller.MagneticTile />
        </Controller.Mirror>
      </Core>
      <Suffix className={clsx(styles.overview, styles.suffix)}>footer</Suffix>
      <FloatButton.Group
        trigger="click"
        placement="top"
        style={{
          bottom: 30,
          insetInlineEnd: 30,
          position: 'absolute'
        }}
        icon={<Icon icon="ant-design:arrow-up-outlined" />}>
        <FloatButton
          icon={<Icon icon="ant-design:login-outlined" />}
          onClick={onOpenSignin}
        />
        <FloatButton icon={<Icon icon="ant-design:logout-outlined" />} />
      </FloatButton.Group>
      <ReSignIn
        open={signinOpen}
        onClose={onCloseSignin}
      />
    </Payload>
  )
}

interface FragmentProps {
  series: Engine.Item[]
  navigation: number
  onSelect: (item: Engine.Item) => void
  onNavigate: (index: number) => void
}

function findItemScrollTop(
  container: HTMLElement,
  item: HTMLElement,
  index: number,
  total: number,
  viewTop: number
) {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  if (total <= 0) return viewTop

  // 首尾直接贴边，避免 pad 把目标推离边界
  if (index <= 0) return 0
  if (index >= total - 1) return maxScroll

  const viewBottom = viewTop + container.clientHeight
  const itemTop = item.offsetTop
  const itemBottom = itemTop + item.offsetHeight
  const pad = FRAGMENT.SCROLL_PAD

  if (itemBottom > viewBottom - pad) {
    return Math.min(maxScroll, itemBottom - container.clientHeight + pad)
  }
  if (itemTop < viewTop + pad) {
    return Math.max(0, itemTop - pad)
  }
  return viewTop
}

function ReFragment(props: FragmentProps) {
  const { series, navigation, onSelect, onNavigate } = props
  const fragmentRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const sessionRef = useRef<FragmentScrollSession | null>(null)
  const indicatorDriverRef = useRef<IndicatorDriver | null>(null)
  const scrollTarget = useRef(0)
  const isFirstPaint = useRef(true)
  const skipScroll = useRef(false)
  // 键盘滚动时列表在光标下移动会触发 mouseenter，需暂时忽略指针选中
  const isPointerNavLocked = useRef(false)
  const pointerUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const seriesKey = series
    .map(function (item) {
      return item.id
    })
    .join('|')
  const boundKey = useRef('')

  function unlockPointerNav() {
    if (pointerUnlockTimer.current) {
      clearTimeout(pointerUnlockTimer.current)
      pointerUnlockTimer.current = null
    }
    isPointerNavLocked.current = false
  }

  function lockPointerNav(durationMs: number) {
    isPointerNavLocked.current = true
    if (pointerUnlockTimer.current) {
      clearTimeout(pointerUnlockTimer.current)
    }
    pointerUnlockTimer.current = setTimeout(function () {
      isPointerNavLocked.current = false
      pointerUnlockTimer.current = null
    }, durationMs)
  }

  function ensureIndicatorDriver() {
    const indicator = indicatorRef.current
    if (!indicator) return null
    if (!indicatorDriverRef.current) {
      indicatorDriverRef.current = createIndicatorDriver(indicator)
    }
    return indicatorDriverRef.current
  }

  function bindScrollSession() {
    const el = fragmentRef.current
    if (!el) return
    if (boundKey.current === seriesKey && sessionRef.current) return

    boundKey.current = seriesKey
    itemRefs.current = itemRefs.current.slice(0, series.length)
    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[]
    sessionRef.current?.destroy()
    sessionRef.current = bindFragmentScroll(el, items, {
      onScrollTarget: function (value) {
        scrollTarget.current = value
      }
    })

    const driver = ensureIndicatorDriver()
    if (!driver) return
    if (navigation < 0) {
      driver.hide()
      return
    }
    const active = itemRefs.current[navigation]
    if (active) {
      driver.sync(active, true)
    }
  }

  useEffect(
    function () {
      isFirstPaint.current = true
      boundKey.current = ''
      scrollTarget.current = fragmentRef.current?.scrollTop ?? 0
      unlockPointerNav()
      indicatorDriverRef.current?.destroy()
      indicatorDriverRef.current = null

      return function () {
        unlockPointerNav()
        sessionRef.current?.destroy()
        sessionRef.current = null
        indicatorDriverRef.current?.destroy()
        indicatorDriverRef.current = null
        boundKey.current = ''
      }
    },
    [seriesKey]
  )

  useEffect(
    function () {
      const container = fragmentRef.current
      const driver = ensureIndicatorDriver()
      if (!container || !driver) return

      if (navigation < 0) {
        driver.hide()
        return
      }

      const active = itemRefs.current[navigation]
      if (!active) return

      const instant = isFirstPaint.current
      isFirstPaint.current = false
      driver.sync(active, instant)

      if (skipScroll.current) {
        skipScroll.current = false
        return
      }

      // 用目标 scrollTop，避免上一段键盘动画未结束时用中间值算错
      const viewTop = scrollTarget.current
      const next = findItemScrollTop(container, active, navigation, series.length, viewTop)

      if (Math.abs(next - viewTop) < 0.5) return

      scrollTarget.current = next
      const durationMs = Math.round(SCROLL_DURATION * 1000) + 40
      lockPointerNav(durationMs)
      sessionRef.current?.scrollTo(next, {
        duration: SCROLL_DURATION,
        onComplete: unlockPointerNav
      })
    },
    [navigation, seriesKey, series.length]
  )

  return (
    <motion.div
      ref={fragmentRef}
      initial={{
        opacity: 0,
        y: -6,
        clipPath: 'inset(0 0 10% 0)'
      }}
      animate={{
        opacity: 1,
        y: 0,
        clipPath: 'inset(0 0 0% 0)'
      }}
      exit={{
        opacity: 0,
        y: -4,
        clipPath: 'inset(0 0 8% 0)'
      }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={clsx(styles.engine, styles.fragment)}
      role="listbox">
      <motion.div
        key={seriesKey}
        className={clsx(styles.engine, styles.fragmentTrack)}
        variants={FRAGMENT.LIST_VARIANTS}
        initial="hidden"
        animate="show"
        onAnimationComplete={bindScrollSession}>
        <div
          ref={indicatorRef}
          className={clsx(styles.engine, styles.fragmentIndicator)}
          aria-hidden
        />
        {series.map(function (item, index) {
          const isActive = navigation === index
          return (
            <motion.div
              key={`${item.id}-${index}`}
              variants={FRAGMENT.ITEM_VARIANTS}
              ref={function (node) {
                itemRefs.current[index] = node
              }}
              role="option"
              aria-selected={isActive}
              className={clsx(styles.engine, styles.fragmentValue, {
                [styles.fragmentActive]: isActive
              })}
              onMouseEnter={function () {
                if (isPointerNavLocked.current) return
                if (index === navigation) return
                skipScroll.current = true
                onNavigate(index)
              }}
              onClick={function (e) {
                e.stopPropagation()
                onSelect(item)
              }}>
              <span>{parseSuggestionLabel(item.q)}</span>
              <Icon
                icon="mdi:arrow-right"
                className={clsx(styles.engine, styles.fragmentMark, {
                  [styles.fragmentMarkActive]: isActive
                })}
              />
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
