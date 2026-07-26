import { Button, Select, Space } from 'antd'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide.tsx'
import { MarketplaceContext } from '@/features/applications/marketplace/workspace/context'
import { useMirrorStore } from '@/stores/mirror.ts'

import styles from '@/features/applications/marketplace/workspace/booth/summary.module.scss'

export default function Summary() {
  const { onUpdatePage } = useContext(MarketplaceContext)
  const mirrors = useMirrorStore((state) => state.mirrors)
  const [mirror, onUpdateMirror] = useState<Mirror | null>(null)

  function onChangeMirror(value: Mirror | null) {
    onUpdateMirror(value)
  }

  return (
    <div className={clsx(styles.summary)}>
      <Glide.X
        styles={{
          root: {
            flexGrow: 1,
            flexShrink: 0,
            flexBasis: '0%',
            minWidth: '0px',
            height: '38px'
          },
          inner: {
            columnGap: '6px',
            justifyContent: 'flex-start'
          }
        }}>
        {Array.from({ length: 30 }).map(function (_, index) {
          return (
            <div
              key={index}
              style={{
                height: '100%',
                display: 'flex',
                cursor: 'pointer',
                borderRadius: '4px',
                paddingInline: '6px',
                whiteSpace: 'nowrap',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.3)'
              }}>
              分类{index + 1}
            </div>
          )
        })}
      </Glide.X>
      <Space.Compact>
        <Select
          style={{ width: '200px' }}
          value={mirror}
          defaultValue={mirror}
          onChange={onChangeMirror}
          options={mirrors}
          fieldNames={{
            value: 'id',
            label: 'title'
          }}
          optionLabelProp="title"
        />
        <Button
          type="dashed"
          className="cursor-pointer"
          onClick={function () {
            onUpdatePage('navigate')
          }}>
          网址
        </Button>
        <Button
          type="dashed"
          className="cursor-pointer"
          onClick={function () {
            onUpdatePage('customize')
          }}>
          定制
        </Button>
      </Space.Compact>
    </div>
  )
}
