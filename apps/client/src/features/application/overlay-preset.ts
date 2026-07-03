import type { ModalProps } from 'antd'

/** 应用卡片 overlay：collection / intelligence / marketplace 等 */
export const OVERLAY_RATIO: Pick<ModalProps, 'width' | 'style' | 'styles'> = {
  width: '80%',
  style: {
    aspectRatio: '16 / 9',
    borderRadius: '8px',
    minWidth: 600
  },
  styles: {
    container: { height: '100%' },
    body: { height: '100%', padding: 0 }
  }
}

/** 面板型 overlay：settings 等固定尺寸 */
export const OVERLAY_PANEL = {
  width: 'min(92vw, 960px)',
  style: {
    height: 'min(88vh, 720px)',
    maxHeight: 'min(88vh, 720px)',
    borderRadius: '16px',
    aspectRatio: 'unset' as const,
    minWidth: 'unset' as const
  },
  styles: {
    container: { padding: 0, height: '100%' },
    body: {
      padding: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }
} satisfies Pick<ModalProps, 'width' | 'style' | 'styles'>

/** 全屏 overlay */
export const OVERLAY_FULLSCREEN: Pick<ModalProps, 'width' | 'height' | 'style' | 'styles'> = {
  width: '100%',
  height: '100%',
  style: { aspectRatio: 'unset', borderRadius: 0 },
  styles: {
    container: { height: '100%', padding: 0 },
    body: { height: '100%', padding: 0 }
  }
}
