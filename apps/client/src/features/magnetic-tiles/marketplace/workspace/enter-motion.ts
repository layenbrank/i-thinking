import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const CARD_ATTR = 'data-list-card'
const CARD_SELECTOR = `[${CARD_ATTR}]`

const ENTER_Y = 28
const ENTER_DURATION = 0.45
/** 向下：卡顶进入 scroller 约 85% 再播（gsap-skills） */
const BATCH_START = 'top 85%'
/** 向上：卡顶碰到 scroller 顶才 leave（官方 advanced：top top） */
const BATCH_END = 'top top'
/** 与 BATCH_START 同义：卡顶相对 scroller 高度的进场比例 */
const ENTER_LINE_RATIO = 0.85
const BATCH_INTERVAL = 0.08
const BATCH_MAX = 8
const STUCK_OPACITY = 0.5
const CLEAR_ENTER_PROPS = 'y,opacity,visibility'

gsap.registerPlugin(ScrollTrigger)

type EnterFrom = 'below' | 'above'

type EnterMotion = {
  destroy(): void
}

type BindEnterMotionOptions = {
  selector?: string
}

function findCards(scroller: Element, selector: string) {
  return gsap.utils.toArray<HTMLElement>(selector, scroller)
}

function isCardInScroller(card: HTMLElement, scroller: Element) {
  const cardRect = card.getBoundingClientRect()
  const rootRect = scroller.getBoundingClientRect()
  return cardRect.top < rootRect.bottom && cardRect.bottom > rootRect.top
}

function isFullyAbove(card: HTMLElement, scroller: Element) {
  return card.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().top
}

/** 等价 start: top 85% —— 卡顶已越过进场线 */
function isPastEnterLine(card: HTMLElement, scroller: Element) {
  const cardRect = card.getBoundingClientRect()
  const rootRect = scroller.getBoundingClientRect()
  const enterY = rootRect.top + rootRect.height * ENTER_LINE_RATIO
  return cardRect.top <= enterY
}

function findEnterY(from: EnterFrom) {
  return from === 'below' ? ENTER_Y : -ENTER_Y
}

/**
 * marketplace 列表进场（booth / navigate）：
 * - start/end 对齐 GSAP 文档；refresh 前清 y，避免触发线漂移
 * - 仅出屏才 hide / 清 played；兜底与进场线同阈值
 */
function bindEnterMotion(scroller: Element, options?: BindEnterMotionOptions): EnterMotion {
  const selector = options?.selector ?? CARD_SELECTOR
  const mm = gsap.matchMedia()

  mm.add(
    {
      reduceMotion: '(prefers-reduced-motion: reduce)',
      canMotion: '(prefers-reduced-motion: no-preference)'
    },
    function (context) {
      const reduceMotion = Boolean(context.conditions?.reduceMotion)
      const cards = findCards(scroller, selector)
      const played = new WeakSet<HTMLElement>()

      function hideCards(batch: HTMLElement[], readyFrom: EnterFrom) {
        if (batch.length === 0) return
        for (const card of batch) played.delete(card)
        gsap.set(batch, {
          autoAlpha: 0,
          y: findEnterY(readyFrom),
          overwrite: true
        })
      }

      function showCardsInstant(batch: HTMLElement[]) {
        if (batch.length === 0) return
        for (const card of batch) played.add(card)
        gsap.set(batch, {
          autoAlpha: 1,
          y: 0,
          overwrite: true,
          clearProps: CLEAR_ENTER_PROPS
        })
      }

      function playEnter(batch: HTMLElement[], from: EnterFrom) {
        const next = batch.filter(function (card) {
          if (played.has(card)) return false
          played.add(card)
          return true
        })
        if (next.length === 0) return

        for (const card of next) {
          const opacity = Number(gsap.getProperty(card, 'opacity'))
          const fromAlpha = opacity < STUCK_OPACITY ? 0 : opacity
          gsap.fromTo(
            card,
            { autoAlpha: fromAlpha, y: findEnterY(from) },
            {
              autoAlpha: 1,
              y: 0,
              duration: ENTER_DURATION,
              ease: 'power2.out',
              overwrite: true,
              clearProps: CLEAR_ENTER_PROPS
            }
          )
        }
      }

      /** 仅真正出屏才清 played + hide；视口内 leave 不重播 */
      function onLeaveZone(batch: HTMLElement[], readyFrom: EnterFrom) {
        const outside = batch.filter(function (card) {
          return !isCardInScroller(card, scroller)
        })
        if (outside.length === 0) return
        hideCards(outside, readyFrom)
      }

      /**
       * 快滚漏触兜底：已过进场线、仍透明、无 tween → playEnter
       * 不用「任意相交」hard show，避免抢 batch start
       */
      function revealStuckCards() {
        const stuck: HTMLElement[] = []
        for (const card of cards) {
          if (!isPastEnterLine(card, scroller)) continue
          if (gsap.isTweening(card)) continue
          if (played.has(card)) continue
          const opacity = Number(gsap.getProperty(card, 'opacity'))
          if (opacity < STUCK_OPACITY) stuck.push(card)
        }
        if (stuck.length > 0) playEnter(stuck, 'below')
      }

      if (reduceMotion) {
        showCardsInstant(cards)
        return
      }

      const ready: HTMLElement[] = []
      const above: HTMLElement[] = []
      const below: HTMLElement[] = []
      for (const card of cards) {
        if (isPastEnterLine(card, scroller) && isCardInScroller(card, scroller)) {
          ready.push(card)
        } else if (isFullyAbove(card, scroller)) {
          above.push(card)
        } else {
          below.push(card)
        }
      }

      hideCards(above, 'above')
      hideCards(below, 'below')

      ScrollTrigger.batch(cards, {
        scroller,
        start: BATCH_START,
        end: BATCH_END,
        interval: BATCH_INTERVAL,
        batchMax: BATCH_MAX,
        /** 官方：refresh 前临时清 y，避免 transform 打乱 start/end */
        onRefreshInit() {
          return gsap.set(cards, { y: 0 })
        },
        onEnter(batch) {
          playEnter(batch as HTMLElement[], 'below')
        },
        onEnterBack(batch) {
          playEnter(batch as HTMLElement[], 'above')
        },
        onLeave(batch) {
          onLeaveZone(batch as HTMLElement[], 'above')
        },
        onLeaveBack(batch) {
          onLeaveZone(batch as HTMLElement[], 'below')
        }
      })

      playEnter(ready, 'below')

      scroller.addEventListener('scroll', revealStuckCards, { passive: true })
      const revealFrame = window.requestAnimationFrame(revealStuckCards)

      return function () {
        window.cancelAnimationFrame(revealFrame)
        scroller.removeEventListener('scroll', revealStuckCards)
      }
    }
  )

  return {
    destroy() {
      mm.revert()
    }
  }
}

export { CARD_ATTR, CARD_SELECTOR, bindEnterMotion }
export type { BindEnterMotionOptions, EnterMotion }
