import { clsx } from 'clsx'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { OverlayAction, ReloadAction } from '@/features/window/actions'
import { buildBlobUrl, revokeBlobUrl } from '@/features/capture/image'
import { useThrough } from '@/hooks/use-through'
import { Utility } from '@/components/utility'

import styles from '@/views/overlay/overlay.module.scss'

/** lazy：避免 overlay 启动就解析 Konva 截屏 UI */
const Capture = lazy(function () {
  return import('@/features/capture/capture').then(function (mod) {
    return { default: mod.Capture }
  })
})

const OVERLAY_SHELL_SOURCE = 'overlay-shell'

type OverlayMode = 'idle' | 'capture'

/** 渲染侧会话：bytes 已换成 Blob URL */
interface CaptureSessionView {
  path: string
  url: string
  width: number
  height: number
}

interface TextureItem {
  id: string
  src: string
  url: string
  w: number
  h: number
  x: number
  y: number
}

/**
 * Overlay 页面：浮层窗口壳。
 * idle — 调试工具 + 贴图纹理舞台（浮层磁贴落地后挂这里）
 * capture — features/capture 全屏截屏
 */
export default function Overlay() {
  const shellRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<OverlayMode>('idle')
  const [isConcealed, setConcealed] = useState(false)
  const [session, setSession] = useState<CaptureSessionView | null>(null)
  const [textures, setTextures] = useState<TextureItem[]>([])
  const sessionUrlRef = useRef<string | null>(null)
  const texturesRef = useRef<TextureItem[]>([])
  texturesRef.current = textures

  const isCapture = mode === 'capture'

  useThrough(OVERLAY_SHELL_SOURCE, {
    rootRef: shellRef,
    enabled: !isCapture && !isConcealed
  })

  useEffect(
    function () {
      document.documentElement.dataset.shell = 'overlay'
      return function () {
        delete document.documentElement.dataset.shell
      }
    },
    []
  )

  useEffect(
    function () {
      void window.itc.overlay.toRead().then(function (state) {
        setMode(state.mode)
      })

      return window.itc.overlay.onEvent(function (event) {
        if (event.type === 'conceal') {
          setConcealed(true)
          return
        }
        if (event.type === 'reveal') {
          setConcealed(false)
          return
        }
        if (event.type === 'mode') {
          setMode(event.mode)
          if (event.mode === 'idle') {
            revokeBlobUrl(sessionUrlRef.current)
            sessionUrlRef.current = null
            setSession(null)
          }
          return
        }
        if (event.type === 'session') {
          revokeBlobUrl(sessionUrlRef.current)
          const url = buildBlobUrl(event.bytes)
          sessionUrlRef.current = url
          setSession({
            path: event.path,
            url,
            width: event.width,
            height: event.height
          })
          setMode('capture')
        }
      })
    },
    []
  )

  useEffect(
    function () {
      return function () {
        revokeBlobUrl(sessionUrlRef.current)
        sessionUrlRef.current = null
        for (const item of texturesRef.current) revokeBlobUrl(item.url)
      }
    },
    []
  )

  function onCaptureExit() {
    revokeBlobUrl(sessionUrlRef.current)
    sessionUrlRef.current = null
    setSession(null)
    setMode('idle')
  }

  function onTexture(input: { id: string; src: string; url: string; w: number; h: number }) {
    const margin = 24
    setTextures(function (prev) {
      const offset = prev.length * 16
      return [
        ...prev,
        {
          id: input.id,
          src: input.src,
          url: input.url,
          w: input.w,
          h: input.h,
          x: margin + offset,
          y: margin + 40 + offset
        }
      ]
    })
    void window.itc.overlay.toUpdate({ visible: true, mode: 'idle' })
  }

  return (
    <div
      ref={shellRef}
      data-overlay-shell
      className={clsx(styles.shell, isConcealed && styles.concealed)}>
      {!isCapture ? (
        <Utility className={styles.chrome}>
          <OverlayAction />
          <ReloadAction />
        </Utility>
      ) : null}
      <div
        ref={stageRef}
        className={styles.stage}>
        {isCapture && session ? (
          <Suspense fallback={null}>
            <Capture
              embedded
              active
              session={session}
              onExit={onCaptureExit}
              onTexture={onTexture}
            />
          </Suspense>
        ) : null}
        {!isCapture
          ? textures.map(function (item) {
              return (
                <img
                  key={item.id}
                  className={styles.texture}
                  data-region="false"
                  src={item.url}
                  alt=""
                  draggable={false}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.w,
                    height: item.h
                  }}
                />
              )
            })
          : null}
      </div>
    </div>
  )
}
