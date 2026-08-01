import { useEffect, useMemo, useState } from 'react'
import { cyan, generate, green, presetPalettes, red } from '@ant-design/colors'
import {
  App,
  Button,
  Card,
  Col,
  ColorPicker,
  type ColorPickerProps,
  Divider,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Skeleton,
  Slider,
  theme
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'
import {
  useMirrorStore,
  type MagneticTileUpdate,
  type MagneticTileWrite
} from '@/stores/mirror.ts'

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
  textColor: string
  backdropBlur: number
  backdropOpacity: number
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
const TEXT_COLOR = '#ffffff'
const CREATE_KEY = '__create__'
const BLUR_MAX = 24
const OPACITY_DEFAULT = 1

const validateMessages = {
  required: '${label}是必填的!',
  types: {
    title: '${label}不是有效标题!',
    url: '${label}不是有效链接!'
  }
}

function genPresets(presets = presetPalettes) {
  return Object.entries(presets).map<Presets>(function ([label, colors]) {
    return {
      label,
      colors,
      key: label
    }
  })
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

function findPicsumIdFromUrl(url: string | undefined, images: PicsumImage[]) {
  if (!url) return undefined

  const idMatch = url.match(/\/id\/([^/]+)\//)
  if (idMatch) {
    const id = idMatch[1]
    if (
      images.some(function (image) {
        return image.id === id
      })
    ) {
      return id
    }
  }

  const seedMatch = url.match(/\/seed\/([^/]+)\//)
  if (seedMatch) {
    const seed = seedMatch[1]
    const found = images.find(function (image) {
      return image.seed === seed
    })
    if (found) return found.id
  }

  return undefined
}

function parseCssNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const matched = String(value).match(/([\d.]+)/)
  if (!matched) return fallback
  const parsed = Number(matched[1])
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseCustomizeBackdrop(
  blur: number,
  opacity: number
): MagneticTile.Backdrop | null {
  const hasBlur = blur > 0
  const hasOpacity = opacity < OPACITY_DEFAULT
  if (!hasBlur && !hasOpacity) return null

  const backdrop: MagneticTile.Backdrop = {}
  if (hasBlur) backdrop.blur = `${blur}px`
  if (hasOpacity) backdrop.opacity = String(opacity)
  return backdrop
}

function parseBackgroundImage(
  value: CustomizeFormValues,
  images: PicsumImage[],
  keptImageUrl: string | null
) {
  const selectedImage = findPicsumImage(images, value.image)
  if (selectedImage) {
    return buildPicsumUrl(selectedImage, PICSUM_PREVIEW_WIDTH, PICSUM_PREVIEW_HEIGHT)
  }
  return keptImageUrl ?? undefined
}

function parseCustomizeWrite(
  value: CustomizeFormValues,
  images: PicsumImage[],
  mirrorID: string,
  index: number,
  keptImageUrl: string | null
): MagneticTileWrite {
  const imageUrl = parseBackgroundImage(value, images, keptImageUrl)

  return {
    index,
    title: value.title.trim(),
    url: value.url.trim(),
    round: '12px',
    mark: null,
    component: 'navigation',
    description: value.title.trim(),
    background: {
      color: value.color,
      image: imageUrl,
      size: 'cover',
      position: 'center'
    },
    backdrop: parseCustomizeBackdrop(value.backdropBlur, value.backdropOpacity),
    mirrorID,
    textColor: value.textColor,
    collectionID: null,
    size: 2,
    shape: 'rectangle',
    direction: 'horizontal'
  }
}

function parseCustomizeChange(
  value: CustomizeFormValues,
  images: PicsumImage[],
  keptImageUrl: string | null
): MagneticTile.Change {
  const imageUrl = parseBackgroundImage(value, images, keptImageUrl)

  return {
    title: value.title.trim(),
    url: value.url.trim(),
    description: value.title.trim(),
    background: {
      color: value.color,
      image: imageUrl,
      size: 'cover',
      position: 'center'
    },
    backdrop: parseCustomizeBackdrop(value.backdropBlur, value.backdropOpacity),
    textColor: value.textColor
  }
}

function parseTileToForm(
  tile: MagneticTile,
  images: PicsumImage[],
  fallbackColor: string
): { values: Partial<CustomizeFormValues>; keptImageUrl: string | null } {
  const imageUrl = tile.background?.image ?? null
  const picsumId = findPicsumIdFromUrl(imageUrl ?? undefined, images)

  return {
    keptImageUrl: picsumId ? null : imageUrl,
    values: {
      title: tile.title,
      url: tile.url ?? '',
      color: tile.background?.color ?? fallbackColor,
      image: picsumId ?? images[0]?.id,
      textColor: tile.textColor ?? TEXT_COLOR,
      backdropBlur: parseCssNumber(tile.backdrop?.blur, 0),
      backdropOpacity: parseCssNumber(tile.backdrop?.opacity, OPACITY_DEFAULT)
    }
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

const customPanelRender: ColorPickerProps['panelRender'] = function (
  _,
  { components: { Picker, Presets } }
) {
  return (
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
}

function RePreview(
  watched: Partial<CustomizeFormValues> | undefined,
  images: PicsumImage[],
  fallbackColor: string,
  keptImageUrl: string | null
) {
  const previewTitle = watched?.title?.trim() || PREVIEW_TITLE_PLACEHOLDER
  const previewUrl = watched?.url?.trim() || PREVIEW_URL_PLACEHOLDER
  const previewColor = watched?.color ?? fallbackColor
  const previewTextColor = watched?.textColor ?? TEXT_COLOR
  const selectedImage = findPicsumImage(images, watched?.image)
  const previewImageUrl = selectedImage
    ? buildPicsumUrl(selectedImage, PICSUM_PREVIEW_WIDTH, PICSUM_PREVIEW_HEIGHT)
    : (keptImageUrl ?? undefined)

  const surfaceStyle = buildSurfaceStyle({
    round: '12px',
    textColor: previewTextColor,
    background: {
      color: previewColor,
      image: previewImageUrl,
      size: 'cover',
      position: 'center'
    },
    backdrop: parseCustomizeBackdrop(
      watched?.backdropBlur ?? 0,
      watched?.backdropOpacity ?? OPACITY_DEFAULT
    )
  })

  return (
    <div className={styles.previewPanel}>
      <div
        className={styles.previewCard}
        style={surfaceStyle}>
        <div className={styles.previewOverlay}>
          <p
            className={styles.previewTitle}
            style={{ color: previewTextColor }}>
            {previewTitle}
          </p>
          <p
            className={styles.previewUrl}
            style={{ color: previewTextColor, opacity: 0.85 }}>
            {previewUrl}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Customize() {
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const mirror = useMirrorStore((state) => state.active.mirror)
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)
  const toInsertMagneticTile = useMirrorStore((state) => state.toInsertMagneticTile)
  const toUpdateMagneticTile = useMirrorStore((state) => state.toUpdateMagneticTile)
  const [submitting, updateSubmitting] = useState(false)
  const [selectedKey, updateSelectedKey] = useState(CREATE_KEY)
  const [keptImageUrl, updateKeptImageUrl] = useState<string | null>(null)

  const navigationTiles = useMemo(
    function () {
      return magneticTiles.filter(function (tile) {
        return tile.component === 'navigation'
      })
    },
    [magneticTiles]
  )

  const tileOptions = useMemo(
    function () {
      return [
        { value: CREATE_KEY, label: '新建网址磁贴' },
        ...navigationTiles.map(function (tile) {
          return {
            value: tile.id,
            label: tile.title || tile.url || tile.id
          }
        })
      ]
    },
    [navigationTiles]
  )

  const isCreateMode = selectedKey === CREATE_KEY

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
  const [colors, updateColors] = useState<string[]>([])
  const [images, updateImages] = useState<PicsumImage[]>([])
  const [isImagesLoading, updateImagesLoading] = useState(true)

  const watchedTitle = Form.useWatch('title', form)
  const watchedUrl = Form.useWatch('url', form)
  const watchedColor = Form.useWatch('color', form)
  const watchedImage = Form.useWatch('image', form)
  const watchedTextColor = Form.useWatch('textColor', form)
  const watchedBackdropBlur = Form.useWatch('backdropBlur', form)
  const watchedBackdropOpacity = Form.useWatch('backdropOpacity', form)
  const watched = {
    title: watchedTitle,
    url: watchedUrl,
    color: watchedColor,
    image: watchedImage,
    textColor: watchedTextColor,
    backdropBlur: watchedBackdropBlur,
    backdropOpacity: watchedBackdropOpacity
  }

  function resetCreateForm(nextImages: PicsumImage[], nextColors: string[]) {
    updateKeptImageUrl(null)
    form.setFieldsValue({
      title: '',
      url: '',
      color: nextColors[0] ?? token.colorPrimary,
      image: nextImages[0]?.id,
      textColor: TEXT_COLOR,
      backdropBlur: 0,
      backdropOpacity: OPACITY_DEFAULT
    })
  }

  function onSelectTile(key: string) {
    updateSelectedKey(key)

    if (key === CREATE_KEY) {
      resetCreateForm(images, colors)
      return
    }

    const tile = navigationTiles.find(function (item) {
      return item.id === key
    })
    if (!tile) return

    const parsed = parseTileToForm(tile, images, token.colorPrimary)
    updateKeptImageUrl(parsed.keptImageUrl)
    form.setFieldsValue(parsed.values)

    if (parsed.values.color && !colors.includes(parsed.values.color)) {
      updateColors(function (prev) {
        return [parsed.values.color as string, ...prev]
      })
    }
  }

  function onChangeComplete(value: Color) {
    const color = value.toHexString()
    form.setFieldValue('color', color)
    updateColors(function (prev) {
      if (prev.includes(color)) return prev
      return [...prev, color]
    })
  }

  function onChangeTextColor(value: Color) {
    form.setFieldValue('textColor', value.toHexString())
  }

  async function handleFinish(value: CustomizeFormValues) {
    const mirrorID = mirror?.id
    if (!mirrorID) {
      message.error('请先选择镜像')
      return
    }

    updateSubmitting(true)
    try {
      if (isCreateMode) {
        const write = parseCustomizeWrite(
          value,
          images,
          mirrorID,
          magneticTiles.length,
          keptImageUrl
        )
        await toInsertMagneticTile([write])
        message.success('添加成功')
        resetCreateForm(images, colors)
      } else {
        const change = parseCustomizeChange(value, images, keptImageUrl)
        const update: MagneticTileUpdate = {
          key: selectedKey,
          change
        }
        await toUpdateMagneticTile([update])
        message.success('保存成功')
      }
    } catch (error) {
      console.error('[Customize] magnetic-tile save failed:', error)
      message.error(error instanceof Error ? error.message : isCreateMode ? '添加失败' : '保存失败')
    } finally {
      updateSubmitting(false)
    }
  }

  useEffect(
    function () {
      const collect = Object.values(DEFAULT_COLORS).reduce<string[]>(function (acc, cur) {
        const toStrings = cur.colors.map(function (color) {
          return color.toString()
        })
        return acc.concat(toStrings)
      }, [])

      requestAnimationFrame(function () {
        updateColors(collect)
        if (selectedKey === CREATE_KEY) {
          form.setFieldsValue({
            color: collect[0] ?? token.colorPrimary,
            textColor: TEXT_COLOR,
            backdropBlur: 0,
            backdropOpacity: OPACITY_DEFAULT
          })
        }
      })
    },
    [DEFAULT_COLORS, form, token.colorPrimary, selectedKey]
  )

  useEffect(
    function () {
      let cancelled = false
      updateImagesLoading(true)

      void fetchPicsumImages().then(function (nextImages) {
        if (cancelled) return
        updateImages(nextImages)
        updateImagesLoading(false)
        if (selectedKey === CREATE_KEY) {
          form.setFieldsValue({
            image: nextImages[0]?.id
          })
        }
      })

      return function () {
        cancelled = true
      }
    },
    [form, selectedKey]
  )

  return (
    <div className={clsx([styles.customize, AOModule.overlay])}>
      <div className={styles.workspace}>
        <div className={styles.formPanel}>
          <Card
            title={null}
            extra={null}
            styles={{ root: { height: '100%' }, body: { height: '100%' } }}>
            <Form
              form={form}
              labelAlign="right"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              initialValues={{
                title: '',
                url: '',
                color: token.colorPrimary,
                image: images[0]?.id,
                textColor: TEXT_COLOR,
                backdropBlur: 0,
                backdropOpacity: OPACITY_DEFAULT
              }}
              style={{ maxWidth: '100%' }}
              onFinish={handleFinish}
              validateMessages={validateMessages}>
              <Form.Item label="磁贴">
                <Select
                  value={selectedKey}
                  options={tileOptions}
                  className="cursor-pointer"
                  onChange={onSelectTile}
                />
              </Form.Item>
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
                  value={watchedColor ?? token.colorPrimary}
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
                label="文字颜色"
                name="textColor"
                rules={[{ required: true }]}
                getValueFromEvent={function (color: Color) {
                  return color.toHexString()
                }}>
                <ColorPicker
                  className="cursor-pointer"
                  showText
                  onChangeComplete={onChangeTextColor}
                />
              </Form.Item>
              <Form.Item
                label="背景模糊"
                name="backdropBlur">
                <Slider
                  min={0}
                  max={BLUR_MAX}
                  tooltip={{
                    formatter: function (value) {
                      return `${value ?? 0}px`
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                label="背景透明"
                name="backdropOpacity">
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Form.Item>
              <Form.Item
                label="背景图片"
                className={clsx([AOModule.single, AOModule.image, styles.imageField])}
                rules={[{ required: isCreateMode }]}>
                <Glide.X
                  style={{
                    width: '100%',
                    height: `${IMAGE_RADIO_HEIGHT}px`
                  }}>
                  <Form.Item
                    name="image"
                    noStyle>
                    <Radio.Group
                      onChange={function () {
                        updateKeptImageUrl(null)
                      }}>
                      {isImagesLoading
                        ? Array.from({ length: PICSUM_LIMIT }).map(function (_, index) {
                            return (
                              <Skeleton.Image
                                key={index}
                                active
                                className={styles.skeleton}
                              />
                            )
                          })
                        : images.map(function (image) {
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
              <Form.Item wrapperCol={{ offset: 5, span: 19 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  className="cursor-pointer">
                  {isCreateMode ? '添加' : '保存'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>

        {RePreview(watched, images, token.colorPrimary, keptImageUrl)}
      </div>
    </div>
  )
}
