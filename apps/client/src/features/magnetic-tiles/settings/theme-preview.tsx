import { Button, Input, Menu, Space } from 'antd'
import type { CSSProperties } from 'react'

import type { Appearance } from '@/themes'

import styles from '@/features/magnetic-tiles/settings/theme-preview.module.scss'

interface ThemePreviewProps {
  appearance: Appearance
}

export default function ThemePreview(props: ThemePreviewProps) {
  return (
    <div
      className={styles.preview}
      style={
        {
          '--preview-radius': `${props.appearance.radius}px`,
          '--preview-font-size': `${props.appearance.fontSize}px`
        } as CSSProperties
      }>
      <div className={styles.previewInner}>
        <Space wrap>
          <Button type="primary">主要按钮</Button>
          <Button>默认按钮</Button>
          <Input
            placeholder="输入框预览"
            style={{ width: 160 }}
          />
        </Space>
        <Menu
          mode="horizontal"
          items={[
            { key: '1', label: '菜单项一' },
            { key: '2', label: '菜单项二' }
          ]}
          className={styles.previewMenu}
        />
      </div>
    </div>
  )
}
