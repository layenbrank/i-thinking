import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { invoke } from '@tauri-apps/api/core'
import { BaseDirectory, create } from '@tauri-apps/plugin-fs'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'
import {
  Button,
  Card,
  Col,
  ColorPicker,
  type ColorPickerProps,
  Divider,
  Form,
  Input,
  message,
  Radio,
  Row,
  Space,
  theme,
  Typography,
  Upload
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import type { RcFile, UploadFile } from 'antd/es/upload'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { useMirrorStore, type MagneticTileWrite } from '@/stores/mirror.ts'
import { timeSphere } from '@i-thinking/utils'
import ReUtility from '@/features/utility/utility.tsx'

import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'
import AOModule from '@/features/magnetic-tiles/marketplace/overlay.module.scss'
import styles from '@/features/magnetic-tiles/marketplace/workspace/customize/customize.module.scss'

type Presets = Required<ColorPickerProps>['presets'][number]

type PicsumImage = {
  id: string
  seed?: string
}

type CustomizeFormValues = {
  title: string
  url: string
  color: string
  image: string
  layout: 'horizontal' | 'vertical'
}

const PICSUM_BASE = 'https://picsum.photos'
const PICSUM_LIMIT = 12
const PICSUM_THUMB_WIDTH = 160
const PICSUM_THUMB_HEIGHT = 90
const PICSUM_PREVIEW_WIDTH = 800
const PICSUM_PREVIEW_HEIGHT = 450
const COLOR_SWATCH_SIZE = 44
const IMAGE_RADIO_HEIGHT = 72
const PREVIEW_TITLE_PLACEHOLDER = '未命名应用'
const PREVIEW_URL_PLACEHOLDER = '请输入链接预览'

const validateMessages = {
  required: '${label}是必填的!',
  types: {
    title: '${label}不是有效标题!',
    url: '${label}不是有效链接!'
  }
}

function genPresets(presets = presetPalettes) {
  return Object.entries(presets).map<Presets>(([label, colors]) => ({
    label,
    colors,
    key: label
  }))
}

function buildFallbackImages(): PicsumImage[] {
  return Array.from({ length: PICSUM_LIMIT }, function (_, index) {
    return {
      id: `fallback-${index}`,
      seed: `customize-${index}`
    }
  })
}

function buildPicsumUrl(image: PicsumImage, width: number, height: number) {
  if (image.seed) {
    return `${PICSUM_BASE}/seed/${image.seed}/${width}/${height}`
  }

  return `${PICSUM_BASE}/id/${image.id}/${width}/${height}`
}

function findPicsumImage(images: PicsumImage[], imageId: string | undefined) {
  if (!imageId) return undefined
  return images.find(function (item) {
    return item.id === imageId
  })
}

function parseCustomizeWrite(
  value: CustomizeFormValues,
  images: PicsumImage[],
  mirrorID: string,
  index: number
): MagneticTileWrite {
  const selectedImage = findPicsumImage(images, value.image)
  const imageUrl = selectedImage
    ? buildPicsumUrl(selectedImage, PICSUM_PREVIEW_WIDTH, PICSUM_PREVIEW_HEIGHT)
    : undefined

  return {
    index,
    title: value.title.trim(),
    url: value.url.trim(),
    round: '12px',
    mark: value.layout,
    component: 'navigation',
    description: value.title.trim(),
    background: {
      color: value.color,
      image: imageUrl,
      size: 'cover',
      position: 'center'
    },
    backdrop: null,
    mirrorID,
    textSize: '13px',
    textColor: '#ffffff',
    collectionID: null
  }
}

function parseImportedWrite(item: MagneticTile, mirrorID: string, index: number): MagneticTileWrite {
  return {
    index: item.index ?? index,
    title: item.title,
    url: item.url,
    round: item.round,
    mark: item.mark,
    component: item.component,
    description: item.description,
    background: item.background,
    backdrop: item.backdrop,
    mirrorID,
    textSize: item.textSize,
    textColor: item.textColor,
    collectionID: null
  }
}

async function fetchPicsumImages(): Promise<PicsumImage[]> {
  try {
    const response = await fetch(`${PICSUM_BASE}/v2/list?limit=${PICSUM_LIMIT}`)
    if (!response.ok) throw new Error('picsum list failed')

    const parsed = (await response.json()) as Array<{ id: string | number }>
    return parsed.map(function (item) {
      return { id: String(item.id) }
    })
  } catch {
    return buildFallbackImages()
  }
}

const customPanelRender: ColorPickerProps['panelRender'] = (
  _,
  { components: { Picker, Presets } }
) => (
  <Row
    justify="space-between"
    wrap={false}>
    <Col span={12}>
      <Presets />
    </Col>
    <Divider
      vertical
      style={{ height: 'auto' }}
    />
    <Col flex="auto">
      <Picker />
    </Col>
  </Row>
)

function RePreview(
  watched: Partial<CustomizeFormValues> | undefined,
  images: PicsumImage[],
  fallbackColor: string
) {
  const previewTitle = watched?.title?.trim() || PREVIEW_TITLE_PLACEHOLDER
  const previewUrl = watched?.url?.trim() || PREVIEW_URL_PLACEHOLDER
  const previewColor = watched?.color ?? fallbackColor
  const selectedImage = findPicsumImage(images, watched?.image)
  const previewImageUrl = selectedImage
    ? buildPicsumUrl(selectedImage, PICSUM_PREVIEW_WIDTH, PICSUM_PREVIEW_HEIGHT)
    : undefined

  return (
    <div className={styles.previewPanel}>
      <div
        className={styles.previewCard}
        style={{
          backgroundColor: previewColor,
          backgroundImage: previewImageUrl ? `url(${previewImageUrl})` : undefined
        }}>
        <div className={styles.previewOverlay}>
          <p className={styles.previewTitle}>{previewTitle}</p>
          <p className={styles.previewUrl}>{previewUrl}</p>
        </div>
      </div>
    </div>
  )
}

export default function Customize() {
  const { token } = theme.useToken()
  const { onUpdatePage } = useContext(MarketplaceContext)

  const mirror = useMirrorStore((state) => state.active.mirror)
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)
  const toInsertMagneticTile = useMirrorStore((state) => state.toInsertMagneticTile)
  const [visible, onUpdateVisible] = useState(false)
  const [submitting, updateSubmitting] = useState(false)
  const DEFAULT_COLORS = useMemo(
    function () {
      return genPresets({
        primary: generate(token.colorPrimary),
        red,
        green,
        cyan
      })
    },
    [token.colorPrimary]
  )

  const [form] = Form.useForm<CustomizeFormValues>()
  const [files, updateFiles] = useState<UploadFile<any>[]>()
  const [colors, updateColors] = useState<string[]>([])
  const [images, updateImages] = useState<PicsumImage[]>(buildFallbackImages)

  const watched = Form.useWatch([], form)

  function onChangeComplete(value: Color) {
    const color = value.toHexString()
    updateColors(function (prev) {
      if (prev.includes(color)) return prev
      return [...prev, color]
    })
  }

  async function handleFinish(value: CustomizeFormValues) {
    const mirrorID = mirror?.id
    if (!mirrorID) {
      message.error('请先选择镜像')
      return
    }

    updateSubmitting(true)
    try {
      const write = parseCustomizeWrite(value, images, mirrorID, magneticTiles.length)
      await toInsertMagneticTile([write])
      message.success('添加成功')
    } catch (error) {
      console.error('[Customize] magnetic-tile:write failed:', error)
      message.error(error instanceof Error ? error.message : '添加失败')
    } finally {
      updateSubmitting(false)
    }
  }

  function onUpdateKeyword(keyword: string) {
    console.log('keyword', keyword)
  }

  const handleExport = useCallback(
    function () {
      const mirrorID = mirror?.id
      if (!mirrorID) {
        message.error('请先选择镜像')
        return
      }

      void invoke<MagneticTile[]>('magnetic-tile:read', { params: { mirrorID } }).then(
        async function (magneticTiles) {
          let permissionGranted = await isPermissionGranted()
          if (!permissionGranted) {
            const permission = await requestPermission()
            permissionGranted = permission === 'granted'
          }
          try {
            const stringify = JSON.stringify(magneticTiles, null, 2)
            const now = timeSphere.now()
            const formatted = now.format('YYYY-MM-DD-HH-mm-ss')
            const filename = `magnetic-tiles-${formatted}.json`
            const encoder = new TextEncoder()
            const uint8 = encoder.encode(stringify)
            const file = await create(filename, {
              baseDir: BaseDirectory.Download
            })
            await file.write(uint8)
            await file.close()
            if (permissionGranted) {
              sendNotification({
                title: import.meta.env.VITE_APP_TITLE,
                body: '导出成功'
              })
            }
            message.success('导出成功')
          } catch (error) {
            if (permissionGranted) {
              sendNotification({
                icon: 'icons/icon.ico',
                summary: (error as Error).message,
                title: import.meta.env.VITE_APP_TITLE,
                body: '导出失败'
              })
            }
            message.error('导出失败')
          }
        }
      )
    },
    [mirror?.id]
  )

  const handleImport = useCallback(
    function (file: RcFile, entries: RcFile[]) {
      const mirrorID = mirror?.id
      if (!mirrorID) {
        message.error('请先选择镜像')
        return false
      }

      updateFiles(entries)

      const reader = new FileReader()
      const baseIndex = magneticTiles.length

      reader.addEventListener(
        'load',
        function () {
          const text = reader.result
          let parsed: MagneticTile[] = []
          try {
            parsed = JSON.parse(text as string)
            if (!Array.isArray(parsed) || parsed.length === 0) {
              message.warning('导入文件为空')
              return
            }
            const writes = parsed.map(function (item, index) {
              return parseImportedWrite(item, mirrorID, baseIndex + index)
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
        {
          once: true
        }
      )

      reader.readAsText(file, 'utf-8')
      return false
    },
    [magneticTiles.length, mirror?.id, toInsertMagneticTile]
  )

  useEffect(
    function () {
      const collect = Object.values(DEFAULT_COLORS).reduce<string[]>(function (acc, cur) {
        const toStrings = cur.colors.map((color) => color.toString())
        return acc.concat(toStrings)
      }, [])

      requestAnimationFrame(function () {
        updateColors(collect)
        form.setFieldsValue({
          color: collect[0] ?? token.colorPrimary
        })
      })
    },
    [DEFAULT_COLORS, form, token.colorPrimary]
  )

  useEffect(
    function () {
      let cancelled = false

      void fetchPicsumImages().then(function (nextImages) {
        if (cancelled) return
        updateImages(nextImages)
        form.setFieldsValue({
          image: nextImages[0]?.id
        })
      })

      return function () {
        cancelled = true
      }
    },
    [form]
  )

  return (
    <div className={clsx([styles.customize, AOModule.overlay])}>
      <ReUtility
        visible={visible}
        section={null}
        onUpdateVisible={onUpdateVisible}
        onUpdateKeyword={onUpdateKeyword}
      />

      <Divider
        size="small"
        style={{ marginBlock: 0 }}
      />

      <div className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="cursor-pointer"
            onClick={function () {
              onUpdatePage('booth')
            }}>
            返回
          </Button>
          <Typography.Title
            level={5}
            className={styles.toolbarTitle}>
            磁贴定制
          </Typography.Title>
        </div>
        <Space
          size="small"
          className={styles.toolbarActions}>
          <Upload
            showUploadList={false}
            fileList={files}
            name="magneticTiles"
            accept="application/json"
            beforeUpload={handleImport}>
            <Button className="cursor-pointer">导入</Button>
          </Upload>
          <Button
            className="cursor-pointer"
            onClick={handleExport}>
            导出
          </Button>
        </Space>
      </div>

      <div className={styles.workspace}>
        <div className={styles.formPanel}>
          <Card
            title={null}
            extra={null}
            styles={{ root: { height: '100%' }, body: { height: '100%' } }}>
            <Form
              form={form}
              labelAlign="right"
              labelCol={{ span: 4 }}
              wrapperCol={{ span: 20 }}
              initialValues={{
                title: '',
                url: '',
                color: token.colorPrimary,
                image: images[0]?.id,
                layout: 'horizontal'
              }}
              style={{ maxWidth: '100%' }}
              onFinish={handleFinish}
              validateMessages={validateMessages}>
              <Form.Item
                label="标题"
                name="title"
                className={clsx([AOModule.single, AOModule.title])}
                rules={[{ required: true }]}>
                <Input placeholder="请输入标题" />
              </Form.Item>
              <Form.Item
                name="url"
                label="链接"
                className={clsx([AOModule.single, AOModule.url])}
                rules={[{ required: true }, { type: 'url' }]}>
                <Input placeholder="请输入链接" />
              </Form.Item>
              <Form.Item
                label="布局"
                name="layout"
                rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio.Button value="horizontal">水平</Radio.Button>
                  <Radio.Button value="vertical">垂直</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                label="背景颜色"
                className={clsx([AOModule.single, AOModule.color, styles.colorField])}
                rules={[{ required: true }]}>
                <Glide.X
                  style={{
                    width: '100%',
                    height: `${COLOR_SWATCH_SIZE}px`
                  }}>
                  <Form.Item
                    name="color"
                    noStyle>
                    <Radio.Group>
                      {colors.map(function (color) {
                        return (
                          <Radio
                            key={color}
                            className={clsx([styles.colorRadio, 'cursor-pointer'])}
                            value={color}
                            styles={{
                              root: {
                                width: COLOR_SWATCH_SIZE,
                                height: COLOR_SWATCH_SIZE
                              },
                              icon: {
                                width: COLOR_SWATCH_SIZE,
                                height: COLOR_SWATCH_SIZE,
                                borderRadius: 6,
                                backgroundColor: color
                              }
                            }}
                          />
                        )
                      })}
                    </Radio.Group>
                  </Form.Item>
                </Glide.X>
                <ColorPicker
                  onChangeComplete={onChangeComplete}
                  className={clsx([AOModule.color, AOModule.picker, styles.colorPicker])}
                  defaultValue={token.colorPrimary}
                  style={{
                    width: COLOR_SWATCH_SIZE,
                    height: COLOR_SWATCH_SIZE
                  }}
                  styles={{ popupOverlayInner: { width: 480 } }}
                  presets={DEFAULT_COLORS}
                  panelRender={customPanelRender}
                />
              </Form.Item>
              <Form.Item
                label="背景图片"
                className={clsx([AOModule.single, AOModule.image, styles.imageField])}
                rules={[{ required: true }]}>
                <Glide.X
                  style={{
                    width: '100%',
                    height: `${IMAGE_RADIO_HEIGHT}px`
                  }}>
                  <Form.Item
                    name="image"
                    noStyle>
                    <Radio.Group>
                      {images.map(function (image) {
                        const thumbUrl = buildPicsumUrl(
                          image,
                          PICSUM_THUMB_WIDTH,
                          PICSUM_THUMB_HEIGHT
                        )

                        return (
                          <Radio
                            key={image.id}
                            value={image.id}
                            className={clsx([styles.imageRadio, 'cursor-pointer'])}
                            styles={{
                              icon: {
                                display: 'none'
                              }
                            }}>
                            <img
                              src={thumbUrl}
                              alt=""
                              className={styles.imageThumb}
                              loading="lazy"
                            />
                          </Radio>
                        )
                      })}
                    </Radio.Group>
                  </Form.Item>
                </Glide.X>
              </Form.Item>
              <Form.Item wrapperCol={{ offset: 4, span: 20 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  className="cursor-pointer">
                  添加
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>

        {RePreview(watched, images, token.colorPrimary)}
      </div>
    </div>
  )
}
