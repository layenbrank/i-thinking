/**
 * Overview 纵向胶囊：镜像切换 + 登录/头像；可拖拽，贴边缩起
 */
import { Avatar } from 'antd'
import { useGSAP } from '@gsap/react'
import { clsx } from 'clsx'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react/offline'

import {
  findIsMirrorSwitching,
  requestMirrorSwitch,
  subscribeMirrorSwitching
} from '@/features/controller/mirror-switch'
import { useMirrorStore } from '@/stores/mirror.ts'
import { useSessionStore } from '@/stores/session.ts'
import styles from '@/views/overview/capsule.module.scss'
import { bindCapsuleDrag } from '@/views/overview/lib/capsule-drag'

gsap.registerPlugin(useGSAP)

type OverviewCapsuleProps = {
  onSignIn: () => void
}

function OverviewCapsule(props: OverviewCapsuleProps) {
  const { onSignIn } = props
  const capsuleRef = useRef<HTMLDivElement>(null)
  const mirrors = useMirrorStore((state) => state.mirrors)
  const activeId = useMirrorStore((state) => state.active.mirror?.id)
  const user = useSessionStore((state) => state.user)
  const [isBusy, setIsBusy] = useState(findIsMirrorSwitching)

  const sorted = mirrors.slice().toSorted(function (a, b) {
    return a.index - b.index
  })
  const canSwitch = sorted.length >= 2 && !isBusy
  const avatarLabel = user?.username ?? ''
  const avatarInitial = avatarLabel ? avatarLabel.slice(0, 1).toUpperCase() : '?'

  useEffect(function () {
    return subscribeMirrorSwitching(function () {
      setIsBusy(findIsMirrorSwitching())
    })
  }, [])

  useGSAP(
    function () {
      const capsule = capsuleRef.current
      if (!capsule) return

      const bounds = capsule.parentElement
      if (!bounds) return

      const session = bindCapsuleDrag(capsule, bounds, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      })

      return function () {
        session.destroy()
      }
    },
    { scope: capsuleRef }
  )

  return (
    <div
      ref={capsuleRef}
      className={styles.capsule}
      data-overview-capsule
      aria-expanded="true"
      aria-busy={isBusy || undefined}>
      <div className={styles.shell}>
        <div
          className={styles.grip}
          data-capsule-grip
          role="button"
          tabIndex={0}
          aria-label="拖动胶囊"
          title="拖动">
          <span className={styles.gripBar} aria-hidden="true" />
        </div>

        <span
          className={styles.chevron}
          aria-hidden="true">
          <Icon
            icon="ant-design:right-outlined"
            width={12}
            height={12}
          />
        </span>

        <div
          className={styles.mirrors}
          role="tablist"
          aria-label="Mirror 分页">
          {sorted.map(function (mirror) {
            const isActive = mirror.id === activeId
            const page = mirror.index + 1
            return (
              <button
                key={mirror.id}
                type="button"
                role="tab"
                data-mirror-bullet
                data-active={isActive ? 'true' : undefined}
                aria-selected={isActive}
                aria-label={mirror.title}
                title={mirror.title}
                disabled={!canSwitch}
                className={clsx(styles.mirror, isActive && styles.mirrorActive)}
                onClick={function () {
                  if (!canSwitch || isActive) return
                  void requestMirrorSwitch(mirror.id)
                }}>
                {page}
              </button>
            )
          })}
        </div>

        <span
          className={styles.divider}
          aria-hidden="true"
        />

        {user ? (
          <div
            className={styles.avatar}
            title={avatarLabel}
            aria-label={`已登录：${avatarLabel}`}>
            <Avatar
              size={26}
              src={user.avatarUrl ?? undefined}
              alt={avatarLabel}>
              {avatarInitial}
            </Avatar>
          </div>
        ) : (
          <button
            type="button"
            className={styles.signIn}
            aria-label="登录"
            title="登录"
            onClick={onSignIn}>
            <Icon
              icon="ant-design:login-outlined"
              width={16}
              height={16}
            />
          </button>
        )}
      </div>
    </div>
  )
}

export { OverviewCapsule }
