import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  ColorPicker,
  type ColorPickerProps,
  Divider,
  Form,
  Input,
  Radio,
  Select,
  Skeleton,
  Slider,
  theme
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import { clsx } from 'clsx'

import { Glide } from '@/components/glide/glide'
import { findComponentLabel, findTileHint } from '@/constants/marketplace/tile-hints'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'
import {
  type ColorFieldName,
  type ColorPreset,
  findShade,
  parseFieldShades,
  parsePresets,
  TEXT_COLOR,
  TEXT_SEED
} from '@/features/magnetic-tiles/marketplace/workspace/customize/colors'
import { useMirrorStore, type MagneticTileUpdate, type MagneticTileWrite } from '@/stores/mirror.ts'

import AOModule from '@/features/magnetic-tiles/marketplace/overlay.module.scss'
import styles from '@/features/magnetic-tiles/marketplace/workspace/customize/customize.module.scss'

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

type TileOption = {
  value: string
  label: string
  description?: string
}

type TileSelectOption = TileOption | { label: string; options: TileOption[] }

const PICSUM_BASE = 'https://picsum.photos'
const PICSUM_LIMIT = 12
const PICSUM_THUMB_WIDTH = 160
const PICSUM_THUMB_HEIGHT = 90
const PICSUM_PREVIEW_WIDTH = 800
const PICSUM_PREVIEW_HEIGHT = 450
const SWATCH_SIZE = 44
const IMAGE_RADIO_HEIGHT = 72
const PREVIEW_TITLE_PLACEHOLDER = '未命名应用'
const PREVIEW_URL_PLACEHOLDER = '请输入链接预览'
const CREATE_KEY = '__create__'
const IMAGE_NONE = '__none__'
const BLUR_MAX = 24
const OPACITY_DEFAULT = 1

const validateMessages = {
  required: '${label}是必填的!',
  types: {
    title: '${label}不是有效标题!',
    url: '${label}不是有效链接!'
  }
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

function parseCustomizeBackdrop(blur: number, opacity: number): MagneticTile.Backdrop | null {
  const hasBlur = blur > 0
  const hasOpacity = opacity < OPACITY_DEFAULT
  if (!hasBlur && !hasOpacity) return null

  const backdrop: MagneticTile.Backdrop = {}
  if (hasBlur) backdrop.blur = `${blur}px`
  if (hasOpacity) backdrop.opacity = String(opacity)
  return backdrop
}

function parseBackgroundImage(
  value: Pick<CustomizeFormValues, 'image'>,
  images: PicsumImage[],
  keptImageUrl: string | null
): string | undefined {
  if (value.image === IMAGE_NONE) return undefined

  const selectedImage = findPicsumImage(images, value.image)
  if (selectedImage) {
    return buildPicsumUrl(selectedImage, PICSUM_PREVIEW_WIDTH, PICSUM_PREVIEW_HEIGHT)
  }

  return keptImageUrl ?? undefined
}

function parseSurface(
  value: CustomizeFormValues,
  images: PicsumImage[],
  keptImageUrl: string | null
) {
  const title = value.title.trim()
  return {
    title,
    description: title,
    textColor: value.textColor,
    background: {
      color: value.color,
      image: parseBackgroundImage(value, images, keptImageUrl),
      size: 'cover' as const,
      position: 'center' as const
    },
    backdrop: parseCustomizeBackdrop(value.backdropBlur, value.backdropOpacity)
  }
}

function parseCustomizeWrite(
  value: CustomizeFormValues,
  images: PicsumImage[],
  mirrorID: string,
  index: number,
  keptImageUrl: string | null
): MagneticTileWrite {
  const surface = parseSurface(value, images, keptImageUrl)

  return {
    index,
    ...surface,
    url: value.url.trim(),
    round: '12px',
    mark: null,
    component: 'navigation',
    mirrorID,
    collectionID: null,
    size: 2,
    shape: 'rectangle',
    direction: 'horizontal'
  }
}

function parseCustomizeChange(
  value: CustomizeFormValues,
  images: PicsumImage[],
  keptImageUrl: string | null,
  canEditUrl: boolean
): MagneticTile.Change {
  const surface = parseSurface(value, images, keptImageUrl)
  if (!canEditUrl) return surface

  return {
    ...surface,
    url: value.url.trim() || null
  }
}

function findTileLabel(tile: MagneticTile) {
  return tile.title.trim() || tile.url || tile.id
}

function findTileDescription(tile: MagneticTile) {
  return tile.description.trim() || findComponentLabel(tile.component)
}

function parseTileOptions(tiles: MagneticTile[]): TileSelectOption[] {
  const navigate: TileOption[] = []
  const booth: TileOption[] = []

  for (const tile of tiles) {
    const option: TileOption = {
      value: tile.id,
      label: findTileLabel(tile),
      description: findTileDescription(tile)
    }
    if (tile.component === 'navigation') navigate.push(option)
    else booth.push(option)
  }

  return [
    { value: CREATE_KEY, label: '新建网址磁贴' },
    ...(navigate.length ? [{ label: '网址', options: navigate }] : []),
    ...(booth.length ? [{ label: '磁贴', options: booth }] : [])
  ]
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
      image: picsumId ?? imageUrl ?? IMAGE_NONE,
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

const renderPanel: ColorPickerProps['panelRender'] = function (
  _,
  { components: { Picker, Presets } }
) {
  return (
    <div className={styles.panel}>
      <div className={styles.presets}>
        <Presets />
      </div>
      <Divider
        vertical
        className={styles.divider}
      />
      <div className={styles.picker}>
        <Picker />
      </div>
    </div>
  )
}

function Preview(props: {
  watched: Partial<CustomizeFormValues> | undefined
  images: PicsumImage[]
  fallbackColor: string
  keptImageUrl: string | null
  component: MagneticTile.Component
}) {
  const title = props.watched?.title?.trim() || PREVIEW_TITLE_PLACEHOLDER
  const color = props.watched?.color ?? props.fallbackColor
  const textColor = props.watched?.textColor ?? TEXT_COLOR
  const imageUrl = parseBackgroundImage(
    { image: props.watched?.image ?? IMAGE_NONE },
    props.images,
    props.keptImageUrl
  )
  const subtitle =
    props.component === 'navigation'
      ? props.watched?.url?.trim() || PREVIEW_URL_PLACEHOLDER
      : findTileHint(props.component, findComponentLabel(props.component))

  const surfaceStyle = buildSurfaceStyle({
    round: '12px',
    textColor,
    background: {
      color,
      image: imageUrl,
      size: 'cover',
      position: 'center'
    },
    backdrop: parseCustomizeBackdrop(
      props.watched?.backdropBlur ?? 0,
      props.watched?.backdropOpacity ?? OPACITY_DEFAULT
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
            style={{ color: textColor }}>
            {title}
          </p>
          <p
            className={styles.previewUrl}
            style={{ color: textColor, opacity: 0.85 }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}

function ColorField(props: {
  name: ColorFieldName
  label: string
  shades: string[]
  value: string | undefined
  fallback: string
  presets: ColorPreset[]
  onPick(color: Color): void
}) {
  return (
    <Form.Item
      label={props.label}
      className={styles.colorField}
      rules={[{ required: true }]}>
      <Glide.X
        style={{
          width: '100%',
          height: `${SWATCH_SIZE}px`
        }}>
        <Form.Item
          name={props.name}
          noStyle>
          <Radio.Group>
            {props.shades.map(function (color) {
              return (
                <Radio
                  key={color}
                  className={clsx([styles.colorRadio, 'cursor-pointer'])}
                  value={color}
                  styles={{
                    root: {
                      width: SWATCH_SIZE,
                      height: SWATCH_SIZE
                    },
                    icon: {
                      width: SWATCH_SIZE,
                      height: SWATCH_SIZE,
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
        onChangeComplete={props.onPick}
        className={styles.colorTrigger}
        value={props.value ?? props.fallback}
        placement="rightTop"
        arrow={false}
        autoAdjustOverflow
        getPopupContainer={function () {
          return document.body
        }}
        style={{
          width: SWATCH_SIZE,
          height: SWATCH_SIZE
        }}
        styles={{
          popupOverlayInner: {
            width: 'max-content',
            padding: 8
          }
        }}
        presets={props.presets}
        panelRender={renderPanel}
      />
    </Form.Item>
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

  const tiles = useMemo(
    function () {
      return [...magneticTiles].sort(function (a, b) {
        return a.index - b.index
      })
    },
    [magneticTiles]
  )

  const isCreateMode = selectedKey === CREATE_KEY
  const selectedTile = isCreateMode
    ? null
    : (tiles.find(function (tile) {
        return tile.id === selectedKey
      }) ?? null)
  const component = selectedTile?.component ?? 'navigation'
  const canEditUrl = isCreateMode || component === 'navigation'

  const tileOptions = useMemo(
    function () {
      return parseTileOptions(tiles)
    },
    [tiles]
  )

  const presets = useMemo(
    function () {
      return parsePresets(token.colorPrimary)
    },
    [token.colorPrimary]
  )

  const [form] = Form.useForm<CustomizeFormValues>()
  const [colorShades, updateColorShades] = useState(function () {
    return parseFieldShades('color', token.colorPrimary)
  })
  const [textShades, updateTextShades] = useState(function () {
    return parseFieldShades('textColor', TEXT_SEED)
  })
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

  function syncPalette(field: ColorFieldName, primary: string) {
    const shades = parseFieldShades(field, primary)
    if (field === 'color') updateColorShades(shades)
    else updateTextShades(shades)
    form.setFieldValue(field, findShade(shades, primary))
  }

  function resetCreate() {
    const nextColorShades = parseFieldShades('color', token.colorPrimary)
    const nextTextShades = parseFieldShades('textColor', TEXT_SEED)
    updateColorShades(nextColorShades)
    updateTextShades(nextTextShades)
    updateKeptImageUrl(null)
    form.setFieldsValue({
      title: '',
      url: '',
      color: findShade(nextColorShades, token.colorPrimary),
      image: IMAGE_NONE,
      textColor: findShade(nextTextShades, TEXT_COLOR),
      backdropBlur: 0,
      backdropOpacity: OPACITY_DEFAULT
    })
  }

  function onSelectTile(key: string) {
    updateSelectedKey(key)

    if (key === CREATE_KEY) {
      resetCreate()
      return
    }

    const tile = tiles.find(function (item) {
      return item.id === key
    })
    if (!tile) return

    const parsed = parseTileToForm(tile, images, token.colorPrimary)
    const bgPrimary = parsed.values.color ?? token.colorPrimary
    const textPrimary = parsed.values.textColor ?? TEXT_COLOR
    const nextColorShades = parseFieldShades('color', bgPrimary)
    const nextTextShades = parseFieldShades('textColor', textPrimary)

    updateKeptImageUrl(parsed.keptImageUrl)
    updateColorShades(nextColorShades)
    updateTextShades(nextTextShades)
    form.setFieldsValue({
      ...parsed.values,
      color: findShade(nextColorShades, bgPrimary),
      textColor: findShade(nextTextShades, textPrimary)
    })
  }

  function onPickColor(field: ColorFieldName) {
    return function (value: Color) {
      syncPalette(field, value.toHexString())
    }
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
        resetCreate()
      } else {
        if (!selectedTile) {
          message.error('未找到要编辑的磁贴')
          return
        }
        const change = parseCustomizeChange(value, images, keptImageUrl, canEditUrl)
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

  useEffect(function () {
    let cancelled = false
    updateImagesLoading(true)

    void fetchPicsumImages().then(function (nextImages) {
      if (cancelled) return
      updateImages(nextImages)
      updateImagesLoading(false)
    })

    return function () {
      cancelled = true
    }
  }, [])

  return (
    <div className={clsx([styles.customize, AOModule.overlay])}>
      <div className={styles.workspace}>
        <div className={styles.formPanel}>
          <Card
            title={null}
            extra={null}
            className={styles.formCard}>
            <Form
              form={form}
              labelAlign="right"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              initialValues={{
                title: '',
                url: '',
                color: findShade(colorShades, token.colorPrimary),
                image: IMAGE_NONE,
                textColor: findShade(textShades, TEXT_COLOR),
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
                  placeholder="选择要编辑的磁贴"
                  showSearch={{
                    optionFilterProp: ['label', 'description']
                  }}
                  onChange={onSelectTile}
                  optionRender={function (option) {
                    const data = option.data as TileOption
                    return (
                      <div className={styles.tileOption}>
                        <span className={styles.tileOptionTitle}>{data.label}</span>
                        {data.description ? (
                          <span className={styles.tileOptionDesc}>{data.description}</span>
                        ) : null}
                      </div>
                    )
                  }}
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
                rules={
                  canEditUrl
                    ? [
                        { required: true },
                        {
                          type: 'url',
                          transform(value: string) {
                            return String(value ?? '').trim() || undefined
                          }
                        }
                      ]
                    : []
                }>
                <Input
                  disabled={!canEditUrl}
                  placeholder={canEditUrl ? '请输入链接' : '非网址磁贴无需链接'}
                />
              </Form.Item>
              <ColorField
                name="color"
                label="背景颜色"
                shades={colorShades}
                value={watchedColor}
                fallback={token.colorPrimary}
                presets={presets}
                onPick={onPickColor('color')}
              />
              <ColorField
                name="textColor"
                label="文字颜色"
                shades={textShades}
                value={watchedTextColor}
                fallback={TEXT_COLOR}
                presets={presets}
                onPick={onPickColor('textColor')}
              />
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
                className={styles.imageField}>
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
                      <Radio
                        value={IMAGE_NONE}
                        aria-label="清空背景图"
                        className={clsx([styles.imageRadio, 'cursor-pointer'])}
                        styles={{
                          icon: {
                            display: 'none'
                          }
                        }}>
                        <span className={styles.imageNone}>无</span>
                      </Radio>
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

        <Preview
          watched={watched}
          images={images}
          fallbackColor={token.colorPrimary}
          keptImageUrl={keptImageUrl}
          component={component}
        />
      </div>
    </div>
  )
}
