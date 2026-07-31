/**
 * Mirror 舞台切换
 *
 * 横向翻页语义（与 pager index 方向一致）+ 磁贴涟漪 stagger 进场
 * 仅 transform / opacity；scrim 无 blur，掩盖 remount 空隙
 */
import gsap from 'gsap'

const EXIT_DURATION = 0.2
const ENTER_DURATION = 0.38
const SLIDE_X = 36
const SCALE = 0.97
const SCRIM_OPACITY = 1
/** 磁贴进场涟漪总跨度 */
const TILE_STAGGER = 0.2
const TILE_FROM_Y = 22

const EASE_EXIT = 'power2.in'
const EASE_ENTER = 'power3.out'
const EASE_SCRIM = 'power2.inOut'

type MirrorDirection = 1 | -1

type MirrorTransitionSession = {
  playExit: (
    pane: HTMLElement,
    direction: MirrorDirection,
    scrim?: HTMLElement | null
  ) => Promise<void>
  playEnter: (
    pane: HTMLElement,
    direction: MirrorDirection,
    scrim?: HTMLElement | null
  ) => Promise<void>
  destroy: () => void
}

function hasReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 由旧/新 mirror 在列表中的 index 推算滑入方向（下一页 → 1） */
function findMirrorDirection(
  mirrors: ReadonlyArray<{ id: string; index: number }>,
  fromId: string | null | undefined,
  toId: string
): MirrorDirection {
  const sorted = mirrors.slice().sort(function (a, b) {
    return a.index - b.index
  })
  const fromIndex = sorted.findIndex(function (item) {
    return item.id === fromId
  })
  const toIndex = sorted.findIndex(function (item) {
    return item.id === toId
  })
  if (fromIndex < 0 || toIndex < 0) return 1
  return toIndex >= fromIndex ? 1 : -1
}

function prepareLayer(el: HTMLElement) {
  el.style.willChange = 'transform, opacity'
}

function clearPane(el: HTMLElement) {
  gsap.set(el, { clearProps: 'transform,opacity,visibility' })
  el.style.removeProperty('will-change')
}

/** 进场可 stagger 的磁贴 surface（无则退回整 pane） */
function findTileSurfaces(pane: HTMLElement): HTMLElement[] {
  return Array.from(pane.querySelectorAll<HTMLElement>('.magnetic-tile-surface'))
}

function clearTileSurfaces(surfaces: HTMLElement[]) {
  if (!surfaces.length) return
  gsap.set(surfaces, { clearProps: 'transform,opacity' })
  for (let i = 0; i < surfaces.length; i++) {
    surfaces[i].style.removeProperty('will-change')
  }
}

function bindMirrorTransition(): MirrorTransitionSession {
  let activeTween: gsap.core.Tween | gsap.core.Timeline | null = null

  function killActive() {
    activeTween?.kill()
    activeTween = null
  }

  function playExit(
    pane: HTMLElement,
    direction: MirrorDirection,
    scrim?: HTMLElement | null
  ) {
    killActive()
    return new Promise<void>(function (resolve) {
      if (hasReducedMotion()) {
        gsap.set(pane, { autoAlpha: 0 })
        if (scrim) gsap.set(scrim, { autoAlpha: 0 })
        resolve()
        return
      }

      prepareLayer(pane)
      if (scrim) {
        prepareLayer(scrim)
        gsap.set(scrim, { autoAlpha: 0 })
      }

      const tl = gsap.timeline({
        defaults: { force3D: true },
        onComplete() {
          activeTween = null
          resolve()
        }
      })
      activeTween = tl

      // 沿翻页方向滑出（下一页 → 向左退）
      tl.to(
        pane,
        {
          autoAlpha: 0,
          x: -direction * SLIDE_X,
          scale: SCALE,
          duration: EXIT_DURATION,
          ease: EASE_EXIT,
          transformOrigin: '50% 50%'
        },
        0
      )

      if (scrim) {
        tl.to(
          scrim,
          {
            autoAlpha: SCRIM_OPACITY,
            duration: EXIT_DURATION * 0.8,
            ease: EASE_SCRIM
          },
          0
        )
      }
    })
  }

  function playEnter(
    pane: HTMLElement,
    direction: MirrorDirection,
    scrim?: HTMLElement | null
  ) {
    killActive()
    return new Promise<void>(function (resolve) {
      if (hasReducedMotion()) {
        gsap.fromTo(
          pane,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.12,
            onComplete() {
              if (scrim) gsap.set(scrim, { autoAlpha: 0 })
              resolve()
            }
          }
        )
        return
      }

      prepareLayer(pane)
      const surfaces = findTileSurfaces(pane)
      const hasTiles = surfaces.length > 0

      if (scrim) {
        prepareLayer(scrim)
        gsap.set(scrim, { autoAlpha: SCRIM_OPACITY })
      }

      const tl = gsap.timeline({
        defaults: { force3D: true },
        onComplete() {
          clearPane(pane)
          clearTileSurfaces(surfaces)
          if (scrim) {
            gsap.set(scrim, { autoAlpha: 0 })
            scrim.style.removeProperty('will-change')
          }
          activeTween = null
          resolve()
        }
      })
      activeTween = tl

      if (hasTiles) {
        // pane 先到位可见；磁贴按翻页方向涟漪入场
        gsap.set(pane, {
          autoAlpha: 1,
          x: direction * SLIDE_X * 0.35,
          scale: 1,
          force3D: true,
          transformOrigin: '50% 50%'
        })
        for (let i = 0; i < surfaces.length; i++) {
          surfaces[i].style.willChange = 'transform, opacity'
        }
        gsap.set(surfaces, {
          opacity: 0,
          y: TILE_FROM_Y,
          x: direction * 10,
          scale: 0.94
        })

        tl.to(
          pane,
          {
            x: 0,
            duration: ENTER_DURATION * 0.7,
            ease: EASE_ENTER
          },
          0
        )

        tl.to(
          surfaces,
          {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            duration: ENTER_DURATION,
            ease: EASE_ENTER,
            stagger: {
              amount: TILE_STAGGER,
              from: direction >= 0 ? 'start' : 'end'
            }
          },
          0.04
        )
      } else {
        gsap.set(pane, {
          autoAlpha: 0,
          x: direction * SLIDE_X,
          scale: SCALE,
          force3D: true,
          transformOrigin: '50% 50%'
        })
        tl.to(
          pane,
          {
            autoAlpha: 1,
            x: 0,
            scale: 1,
            duration: ENTER_DURATION,
            ease: EASE_ENTER
          },
          0
        )
      }

      if (scrim) {
        tl.to(
          scrim,
          {
            autoAlpha: 0,
            duration: ENTER_DURATION * 0.5,
            ease: EASE_SCRIM
          },
          0.06
        )
      }
    })
  }

  return {
    playExit,
    playEnter,
    destroy() {
      killActive()
    }
  }
}

export {
  hasReducedMotion,
  findMirrorDirection,
  bindMirrorTransition,
  EXIT_DURATION,
  ENTER_DURATION,
  SLIDE_X
}

export type { MirrorDirection, MirrorTransitionSession }
