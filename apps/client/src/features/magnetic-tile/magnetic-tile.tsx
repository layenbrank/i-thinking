import { openUrl } from '@tauri-apps/plugin-opener'
import { Tooltip } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Caption } from '@/features/magnetic-tile/caption'
import { Enter, ENTER, useEnter } from '@/features/magnetic-tile/enter'
import styles from '@/features/magnetic-tile/magnetic-tile.module.scss'
import {
  Overlay,
  OverlayContext,
  OverlayProvider,
  type Cache,
  type OverlayControlProps,
  type OverlayMode,
  type OverlayProps
} from '@/features/magnetic-tile/overlay'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'

interface SectionProps extends MagneticTile {
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
  onTrash?: MouseEventHandler<HTMLElement>
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

interface MarkerProps {
  children: ReactNode
  onDoubleClick?: MouseEventHandler<HTMLElement>
  style?: CSSProperties
  className?: ClassValue
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}

interface SkeletonProps {
  className?: ClassValue
  style?: CSSProperties
  id?: string
  size?: MagneticTile.Size
  shape?: MagneticTile.Shape
  direction?: MagneticTile.Direction
}

interface MagneticTileSuspenseProps extends SkeletonProps {
  children: ReactNode
  minDelayMs?: number
  fadeMs?: number
  skeletonClassName?: ClassValue
  skeletonStyle?: CSSProperties
}

type ActivateCtx = {
  tile: Pick<MagneticTile, 'component' | 'url'>
  present: () => void
}

type ActivateFn = (ctx: ActivateCtx) => void

/**
 * 双击侧通道：未登记组件默认 present Overlay。
 * Overlay 蒙层隔离交互，不 pause Mirror 滚动景深。
 */
const SIDE_CHANNELS: Partial<Record<MagneticTile.Component, ActivateFn>> = {
  navigation(ctx) {
    if (!ctx.tile.url) return
    void openUrl(ctx.tile.url)
  }
}

function activateTile(tile: Pick<MagneticTile, 'component' | 'url'>, present: () => void) {
  const channel = SIDE_CHANNELS[tile.component]
  if (channel) return channel({ tile, present })

  present()
}

const MagneticTile = {
  /** 入场声明（Controller）；未包则 surface 无入场动画 */
  Enter,
  /** 纯展示；右键菜单由 Controller 层 ContextMenu 委托 */
  Marker(props: MarkerProps) {
    return (
      <div
        style={props.style}
        onDoubleClick={props.onDoubleClick}
        className={clsx(styles.marker, props.className)}>
        {props.children}
      </div>
    )
  },
  Skeleton(props: SkeletonProps) {
    return (
      <div
        data-id={props.id}
        style={props.style}
        className={clsx(
          'magnetic-tile',
          'magnetic-tile-skeleton',
          styles.magneticTile,
          styles.skeleton,
          props.className,
          props.size ? styles[`lv${props.size}`] : null,
          props.shape ? styles[props.shape] : null,
          props.direction ? styles[props.direction] : null
        )}
      />
    )
  },
  Suspense(props: MagneticTileSuspenseProps) {
    return (
      <Suspense
        fallback={
          <MagneticTile.Skeleton
            id={props.id}
            size={props.size}
            shape={props.shape}
            direction={props.direction}
            style={props.skeletonStyle}
            className={clsx(props.className, props.skeletonClassName)}
          />
        }>
        {props.children}
      </Suspense>
    )
  },
  Caption,
  Overlay,
  Section(props: SectionProps) {
    const nodeRef = useRef<HTMLDivElement>(null)
    // 默认近视口，避免首屏先空 surface 再挂 Marker 闪一下
    const [isNear, setIsNear] = useState(true)
    const { visible, onUpdateVisible } = useContext(OverlayContext)
    const enter = useEnter()
    const isReducedMotion = useReducedMotion()
    const isEnter = enter.isActive
    // 锁定首挂 index：重排改序不重算 stagger，避免误触发观感变化
    const staggerIndexRef = useRef(enter.index)

    useEffect(
      function () {
        const el = nodeRef.current
        if (!el) return

        const root = el.closest('[data-mirror-scroller]')
        const observer = new IntersectionObserver(
          function (entries) {
            for (const entry of entries) {
              // 滞回：进入即 true；离开后仍保持一屏缓冲（rootMargin）才 false
              setIsNear(entry.isIntersecting)
            }
          },
          {
            root: root ?? null,
            rootMargin: '100% 0px',
            threshold: 0
          }
        )
        observer.observe(el)
        return function () {
          observer.disconnect()
        }
      },
      []
    )

    const surfaceStyle = useMemo(
      function () {
        return buildSurfaceStyle({
          round: props.round,
          background: props.background,
          backdrop: props.backdrop,
          textColor: props.textColor
        })
      },
      [props.round, props.background, props.backdrop, props.textColor]
    )

    const surfaceClassName = clsx('magnetic-tile-surface', styles.surface)
    const surfaceBody = isNear ? props.children : null
    const enterTransition = ENTER.transition(staggerIndexRef.current, !!isReducedMotion)

    return (
      <div
        ref={nodeRef}
        onDoubleClick={function () {
          activateTile(props, function () {
            onUpdateVisible(true)
          })
        }}
        data-id={props.id}
        // 仅 Sortable filter 禁拖；与 Mirror 滚动景深零耦合
        data-overlay-open={visible ? 'true' : undefined}
        className={clsx([
          'magnetic-tile',
          styles.magneticTile,
          props.className,
          styles[`lv${props.size}`],
          styles[props.shape],
          styles[props.direction]
        ])}
        style={props.style}>
        {isEnter ? (
          <motion.div
            className={surfaceClassName}
            style={surfaceStyle}
            variants={ENTER.variants}
            initial={isReducedMotion ? false : 'hidden'}
            animate="show"
            transition={enterTransition}>
            {surfaceBody}
          </motion.div>
        ) : (
          <div
            className={surfaceClassName}
            style={surfaceStyle}>
            {surfaceBody}
          </div>
        )}
        <span className={styles.title}>
          <Tooltip
            placement="bottom"
            title={props.title}
            autoAdjustOverflow={false}>
            <span>{props.title}</span>
          </Tooltip>
        </span>
        <button
          type="button"
          aria-label="删除磁贴"
          onClick={props.onTrash}
          className={clsx(styles.destroy, styles.marker)}>
          X
        </button>
      </div>
    )
  }
}

export { MagneticTile, OverlayContext, OverlayProvider }

export type { Cache, MarkerProps, OverlayControlProps, OverlayMode, OverlayProps, SectionProps }
