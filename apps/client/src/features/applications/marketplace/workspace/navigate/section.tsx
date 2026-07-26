import { clsx } from 'clsx'
import { Space, Button } from 'antd'

import { useResize } from '@/hooks/useResize.ts'

import { useMirrorStore } from '@/stores/mirror.ts'

import SModule from '@/features/applications/marketplace/workspace/navigate/section.module.scss'

// interface SectionProps {
// }

export function Section() {
  const applications = useMirrorStore((state) => state.applications)

  return (
    <div className={clsx([SModule.section, SModule.root])}>
      {applications.map(function (optionv) {
        return (
          <ReBooth
            {...optionv}
            key={optionv.id}
          />
        )
      })}
    </div>
  )
}

const VIEWPORT = { width: 1280, height: 720 }

function RePreview({ src }: { src: string }) {
  const [scale, setScale] = useState(1)
  const onResize = useCallback(function (rect: DOMRectReadOnly) {
    const next = Math.min(rect.width / VIEWPORT.width, rect.height / VIEWPORT.height)
    setScale(next)
  }, [])
  const ResizeRef = useResize<HTMLDivElement>(onResize)
  return (
    <div
      ref={ResizeRef}
      className={clsx(SModule.preview)}>
      <div
        className={clsx(SModule.frameWrap)}
        style={{
          width: VIEWPORT.width * scale,
          height: VIEWPORT.height * scale
        }}>
        <iframe
          src={src}
          referrerPolicy="unsafe-url"
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

interface ReBoothProps extends Application {}

function ReBooth(props: ReBoothProps) {
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
        </Space.Compact>
      </div>
      <RePreview src="https://cn.bing.com" />
    </div>
  )
}

export default Section
