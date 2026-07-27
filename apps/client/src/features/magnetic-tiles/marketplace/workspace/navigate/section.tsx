import { Button, Skeleton, Space } from 'antd'
import { clsx } from 'clsx'
import { useCallback, useState } from 'react'

import { useResize } from '@/hooks/useResize.ts'
import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/magnetic-tiles/marketplace/workspace/navigate/section.module.scss'

const VIEWPORT = { width: 1280, height: 720 }

type PreviewProps = {
  src: string
}

type PreviewPlaceholderProps = {
  onPreview: () => void
}

type BoothProps = MagneticTile & {
  isPreviewActive: boolean
  onTogglePreview: (id: string) => void
}

function Section() {
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)
  const [previewId, onUpdatePreviewId] = useState<string | null>(null)

  function onTogglePreview(id: string) {
    onUpdatePreviewId(function (prev) {
      if (prev === id) return null
      return id
    })
  }

  return (
    <div className={clsx([SModule.section, SModule.root])}>
      {magneticTiles.map(function (optionv) {
        return (
          <ReBooth
            {...optionv}
            key={optionv.id}
            isPreviewActive={previewId === optionv.id}
            onTogglePreview={onTogglePreview}
          />
        )
      })}
    </div>
  )
}

function RePreview(props: PreviewProps) {
  const [scale, onUpdateScale] = useState(1)
  const onResize = useCallback(function (rect: DOMRectReadOnly) {
    const next = Math.min(rect.width / VIEWPORT.width, rect.height / VIEWPORT.height)
    onUpdateScale(next)
  }, [])
  const ResizeRef = useResize<HTMLDivElement>(onResize)

  return (
    <div
      ref={ResizeRef}
      className={clsx(SModule.preview)}>
      <div
        className={clsx(SModule.wrap)}
        style={{
          width: VIEWPORT.width * scale,
          height: VIEWPORT.height * scale
        }}>
        <iframe
          src={props.src}
          referrerPolicy="no-referrer"
          width={VIEWPORT.width}
          height={VIEWPORT.height}
          className={clsx(SModule.frame)}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        />
      </div>
    </div>
  )
}

function RePreviewPlaceholder(props: PreviewPlaceholderProps) {
  return (
    <button
      type="button"
      className={clsx(SModule.preview, SModule.placeholder, 'cursor-pointer')}
      onClick={props.onPreview}>
      <Skeleton.Image
        active
        className={clsx(SModule.skeleton)}
      />
      <span className={clsx(SModule.hint)}>点击预览</span>
    </button>
  )
}

function ReBooth(props: BoothProps) {
  const previewUrl = props.url?.trim() || null

  return (
    <div className={clsx(SModule.container)}>
      <div className={clsx(SModule.wrappr)}>
        <div className={clsx(SModule.head)}>
          <span className={clsx(SModule.title)}>{props.title}</span>
          <span className={clsx(SModule.description)}>{props.description}</span>
          <span className={clsx(SModule.download)}>{props.downloadCount}</span>
        </div>

        <Space.Compact
          orientation="horizontal"
          className={clsx(SModule.body)}>
          <Button
            type="primary"
            rootClassName={clsx(SModule.increment)}>
            新增
          </Button>
          <Button
            className="cursor-pointer"
            disabled={!previewUrl}
            onClick={function () {
              props.onTogglePreview(props.id)
            }}>
            {props.isPreviewActive ? '收起预览' : '预览'}
          </Button>
        </Space.Compact>
      </div>
      {props.isPreviewActive && previewUrl ? (
        <RePreview src={previewUrl} />
      ) : (
        <RePreviewPlaceholder
          onPreview={function () {
            if (!previewUrl) return
            props.onTogglePreview(props.id)
          }}
        />
      )}
    </div>
  )
}

export default Section
