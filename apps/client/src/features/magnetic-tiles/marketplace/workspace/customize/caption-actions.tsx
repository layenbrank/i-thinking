import { Icon } from '@iconify/react/offline'
import { invoke } from '@tauri-apps/api/core'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'
import { App, Button, Tooltip, Upload } from 'antd'
import type { RcFile } from 'antd/es/upload'
import { clsx } from 'clsx'

import captionStyles from '@/features/magnetic-tile/caption.module.scss'
import {
  exportTiles,
  parseWrite
} from '@/features/magnetic-tiles/marketplace/workspace/customize/tile-io'
import { useMirrorStore } from '@/stores/mirror.ts'

async function notify(body: string) {
  try {
    let permissionGranted = await isPermissionGranted()
    if (!permissionGranted) {
      const permission = await requestPermission()
      permissionGranted = permission === 'granted'
    }
    if (permissionGranted) {
      sendNotification({
        title: import.meta.env.VITE_APP_TITLE,
        body
      })
    }
  } catch (notifyError) {
    console.warn('[Customize] notification failed:', notifyError)
  }
}

function CaptionActions() {
  const { message } = App.useApp()
  const mirror = useMirrorStore((state) => state.active.mirror)
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)
  const toInsertMagneticTile = useMirrorStore((state) => state.toInsertMagneticTile)

  async function handleExport() {
    const mirrorID = mirror?.id
    if (!mirrorID) {
      message.error('请先选择镜像')
      return
    }

    try {
      const tiles = await invoke<MagneticTile[]>('magnetic-tile:read', {
        params: { mirrorID }
      })
      const exported = await exportTiles(tiles)
      if (!exported) return

      message.success('导出成功')
      await notify('导出成功')
    } catch (error) {
      console.error('[Customize] export failed:', error)
      const detail = error instanceof Error ? error.message : '导出失败'
      message.error(detail)
      await notify(detail)
    }
  }

  function handleImport(file: RcFile) {
    const mirrorID = mirror?.id
    if (!mirrorID) {
      message.error('请先选择镜像')
      return false
    }

    const reader = new FileReader()
    const baseIndex = magneticTiles.length

    reader.addEventListener(
      'load',
      function () {
        const text = reader.result
        try {
          const parsed = JSON.parse(text as string) as MagneticTile[]
          if (!Array.isArray(parsed) || parsed.length === 0) {
            message.warning('导入文件为空')
            return
          }
          const writes = parsed.map(function (item, index) {
            return parseWrite(item, mirrorID, baseIndex + index)
          })
          void toInsertMagneticTile(writes).then(
            function () {
              message.success(`已导入 ${writes.length} 个磁贴`)
            },
            function (error) {
              console.error('[Customize] import failed:', error)
              message.error(error instanceof Error ? error.message : '导入失败')
            }
          )
        } catch (error) {
          console.error('Invalid JSON file', error)
          message.error('JSON 格式无效')
        }
      },
      { once: true }
    )

    reader.readAsText(file, 'utf-8')
    return false
  }

  return (
    <>
      <Tooltip
        title="导入"
        placement="bottom">
        <Upload
          showUploadList={false}
          accept="application/json"
          beforeUpload={handleImport}>
          <Button
            type="text"
            data-region="false"
            aria-label="导入"
            className={clsx(captionStyles.button, 'cursor-pointer')}
            icon={
              <Icon
                icon="ant-design:upload-outlined"
                width={14}
                height={14}
              />
            }
          />
        </Upload>
      </Tooltip>
      <Tooltip
        title="导出"
        placement="bottom">
        <Button
          type="text"
          data-region="false"
          aria-label="导出"
          className={clsx(captionStyles.button, 'cursor-pointer')}
          onClick={handleExport}
          icon={
            <Icon
              icon="ant-design:download-outlined"
              width={14}
              height={14}
            />
          }
        />
      </Tooltip>
    </>
  )
}

export { CaptionActions }
