import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'
import { Card } from '@i-thinking/design/components/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@i-thinking/design/components/form'
import { Input } from '@i-thinking/design/components/input'
import { Label } from '@i-thinking/design/components/label'
import { Popover, PopoverContent, PopoverTrigger } from '@i-thinking/design/components/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Skeleton } from '@i-thinking/design/components/skeleton'
import { Spinner } from '@i-thinking/design/components/spinner'
import { cn } from 'cn'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { findComponentLabel, findTileHint } from '@/constants/marketplace/tile-hints'
import { parsePresetHues } from '@/features/capture/components/colors'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'
import {
  type ColorFieldName,
  findShade,
  parseFieldShades,
  TEXT_COLOR,
  TEXT_SEED
} from '@/views/marketplace/workspace/customize/colors.ts'
import { useMirrorStore, type MagneticTileUpdate, type MagneticTileWrite } from '@/stores/mirror.ts'
import { readAppearance } from '@/features/window/appearance'
import { normalizeHex } from '@/utils/color'

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
const SWATCH_SIZE_CLASS = 'size-11'
const PRESET_SWATCH_CLASS = 'size-6'
const IMAGE_SWATCH_CLASS = 'h-18 w-32'
const PREVIEW_TITLE_PLACEHOLDER = '未命名应用'
const PREVIEW_URL_PLACEHOLDER = '请输入链接预览'
const CREATE_KEY = '__create__'
const IMAGE_NONE = '__none__'
const BLUR_MAX = 24
const OPACITY_DEFAULT = 1

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
): { values: CustomizeFormValues; keptImageUrl: string | null } {
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

function isUrl(value: string) {
  try {
    return Boolean(new URL(value))
  } catch {
    return false
  }
}

function buildCreateValues(
  colorShades: string[],
  textShades: string[],
  themePrimary: string
): CustomizeFormValues {
  return {
    title: '',
    url: '',
    color: findShade(colorShades, themePrimary),
    image: IMAGE_NONE,
    textColor: findShade(textShades, TEXT_COLOR),
    backdropBlur: 0,
    backdropOpacity: OPACITY_DEFAULT
  }
}

function tileOptionKey(option: TileSelectOption) {
  return 'options' in option ? option.label : option.value
}

function Preview(props: {
  watched: Partial<CustomizeFormValues>
  images: PicsumImage[]
  fallbackColor: string
  keptImageUrl: string | null
  component: MagneticTile.Component
}) {
  const title = props.watched.title?.trim() || PREVIEW_TITLE_PLACEHOLDER
  const color = props.watched.color || props.fallbackColor
  const textColor = props.watched.textColor || TEXT_COLOR
  const imageUrl = parseBackgroundImage(
    { image: props.watched.image || IMAGE_NONE },
    props.images,
    props.keptImageUrl
  )
  const subtitle =
    props.component === 'navigation'
      ? props.watched.url?.trim() || PREVIEW_URL_PLACEHOLDER
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
      props.watched.backdropBlur ?? 0,
      props.watched.backdropOpacity ?? OPACITY_DEFAULT
    )
  })

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3 self-stretch">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-cover bg-center bg-no-repeat transition-colors"
        style={surfaceStyle}>
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent px-5 py-4">
          <p
            className="text-xl leading-snug font-semibold"
            style={{ color: textColor }}>
            {title}
          </p>
          <p
            className="mt-1 truncate text-[13px]"
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
  hues: string[]
  value: string | undefined
  fallback: string
  onPick: (color: string) => void
}) {
  const current = normalizeHex(props.value || props.fallback)

  return (
    <FormField
      name={props.name}
      rules={{ required: true }}
      render={function ({ field }) {
        return (
          <FormItem>
            <FormLabel>{props.label}</FormLabel>
            <div className="flex items-center gap-2">
              <div
                role="radiogroup"
                aria-label={props.label}
                className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                {props.shades.map(function (color) {
                  const isSelected = current === normalizeHex(color)
                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={color}
                      title={color}
                      className={cn(
                        SWATCH_SIZE_CLASS,
                        'shrink-0 cursor-pointer rounded-md border border-border transition-shadow',
                        isSelected && 'ring-2 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={function () {
                        field.onChange(color)
                      }}
                    />
                  )
                })}
              </div>

              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`${props.label}更多颜色`}
                    />
                  }>
                  <Icon
                    icon="lucide:palette"
                    aria-hidden
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-64">
                  <div className="grid grid-cols-6 gap-2">
                    {props.hues.map(function (color) {
                      return (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          title={color}
                          className={cn(PRESET_SWATCH_CLASS, 'cursor-pointer rounded-sm border border-border')}
                          style={{ backgroundColor: color }}
                          onClick={function () {
                            props.onPick(color)
                          }}
                        />
                      )
                    })}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    自定义
                    <input
                      type="color"
                      value={current.toLowerCase()}
                      aria-label={`${props.label}自定义颜色`}
                      className="h-7 w-full cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                      onChange={function (event) {
                        props.onPick(event.target.value)
                      }}
                    />
                  </label>
                </PopoverContent>
              </Popover>
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export default function Customize() {
  const themePrimary = useMemo(function () {
    return readAppearance().color
  }, [])
  const mirror = useMirrorStore((state) => state.active.mirror)
  const magneticTiles = useMirrorStore((state) => state.magneticTiles)
  const toInsertMagneticTile = useMirrorStore((state) => state.toInsertMagneticTile)
  const toUpdateMagneticTile = useMirrorStore((state) => state.toUpdateMagneticTile)
  const [submitting, updateSubmitting] = useState(false)
  const [selectedKey, updateSelectedKey] = useState(CREATE_KEY)
  const [keptImageUrl, updateKeptImageUrl] = useState<string | null>(null)
  const [colorShades, updateColorShades] = useState(function () {
    return parseFieldShades('color', themePrimary)
  })
  const [textShades, updateTextShades] = useState(function () {
    return parseFieldShades('textColor', TEXT_SEED)
  })
  const [images, updateImages] = useState<PicsumImage[]>([])
  const [isImagesLoading, updateImagesLoading] = useState(true)

  const form = useForm<CustomizeFormValues>({
    defaultValues: buildCreateValues(colorShades, textShades, themePrimary)
  })
  const watched = useWatch({ control: form.control })
  const values = watched ?? form.getValues()

  const hues = useMemo(
    function () {
      return parsePresetHues(themePrimary)
    },
    [themePrimary]
  )

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

  function syncPalette(field: ColorFieldName, primary: string) {
    const shades = parseFieldShades(field, primary)
    if (field === 'color') updateColorShades(shades)
    else updateTextShades(shades)
    form.setValue(field, findShade(shades, primary))
  }

  function resetCreate() {
    const nextColorShades = parseFieldShades('color', themePrimary)
    const nextTextShades = parseFieldShades('textColor', TEXT_SEED)
    updateColorShades(nextColorShades)
    updateTextShades(nextTextShades)
    updateKeptImageUrl(null)
    form.reset(buildCreateValues(nextColorShades, nextTextShades, themePrimary))
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

    const parsed = parseTileToForm(tile, images, themePrimary)
    const bgPrimary = parsed.values.color || themePrimary
    const textPrimary = parsed.values.textColor || TEXT_COLOR
    const nextColorShades = parseFieldShades('color', bgPrimary)
    const nextTextShades = parseFieldShades('textColor', textPrimary)

    updateKeptImageUrl(parsed.keptImageUrl)
    updateColorShades(nextColorShades)
    updateTextShades(nextTextShades)
    form.reset({
      ...parsed.values,
      color: findShade(nextColorShades, bgPrimary),
      textColor: findShade(nextTextShades, textPrimary)
    })
  }

  function onPickColor(field: ColorFieldName) {
    return function (value: string) {
      syncPalette(field, value)
    }
  }

  async function handleFinish(value: CustomizeFormValues) {
    const mirrorID = mirror?.id
    if (!mirrorID) {
      toast.error('请先选择镜像')
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
        toast.success('添加成功')
        resetCreate()
      } else {
        if (!selectedTile) {
          toast.error('未找到要编辑的磁贴')
          return
        }
        const change = parseCustomizeChange(value, images, keptImageUrl, canEditUrl)
        const update: MagneticTileUpdate = {
          key: selectedKey,
          change
        }
        await toUpdateMagneticTile([update])
        toast.success('保存成功')
      }
    } catch (error) {
      console.error('[Customize] magnetic-tile save failed:', error)
      toast.error(error instanceof Error ? error.message : isCreateMode ? '添加失败' : '保存失败')
    } finally {
      updateSubmitting(false)
    }
  }

  useEffect(function () {
    let cancelled = false

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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="flex min-h-0 flex-1 gap-4 p-3 max-md:flex-col">
        <div className="h-full w-120 shrink-0 overflow-y-auto max-md:w-full">
          <Card className="min-h-full gap-4 py-4">
            <div className="flex flex-col gap-4 px-6">
              <div className="grid gap-2">
                <Label htmlFor="customize-tile">磁贴</Label>
                <Select
                  items={tileOptions.flatMap(function (option) {
                    return 'options' in option ? option.options : [option]
                  })}
                  value={selectedKey}
                  onValueChange={function (value) {
                    if (value === null) return
                    onSelectTile(value)
                  }}>
                  <SelectTrigger
                    id="customize-tile"
                    className="w-full">
                    <SelectValue placeholder="选择要编辑的磁贴" />
                  </SelectTrigger>
                  <SelectContent>
                    {tileOptions.map(function (option) {
                      if (!('options' in option)) {
                        return (
                          <SelectItem
                            key={option.value}
                            value={option.value}>
                            {option.label}
                          </SelectItem>
                        )
                      }
                      return (
                        <SelectGroup key={tileOptionKey(option)}>
                          <SelectLabel>{option.label}</SelectLabel>
                          {option.options.map(function (item) {
                            return (
                              <SelectItem
                                key={item.value}
                                value={item.value}>
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate">{item.label}</span>
                                  {item.description ? (
                                    <span className="truncate text-xs text-muted-foreground">
                                      {item.description}
                                    </span>
                                  ) : null}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <Form {...form}>
                <form
                  noValidate
                  className="flex flex-col gap-4"
                  onSubmit={form.handleSubmit(handleFinish)}>
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: '标题是必填的!' }}
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>标题</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="请输入标题"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    rules={
                      canEditUrl
                        ? {
                            validate: {
                              required: function (value: string) {
                                return value.trim().length > 0 || '链接是必填的!'
                              },
                              url: function (value: string) {
                                const trimmed = value.trim()
                                if (!trimmed) return true
                                return isUrl(trimmed) || '链接不是有效链接!'
                              }
                            }
                          }
                        : undefined
                    }
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>链接</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!canEditUrl}
                              placeholder={canEditUrl ? '请输入链接' : '非网址磁贴无需链接'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <ColorField
                    name="color"
                    label="背景颜色"
                    shades={colorShades}
                    hues={hues}
                    value={values.color}
                    fallback={themePrimary}
                    onPick={onPickColor('color')}
                  />

                  <ColorField
                    name="textColor"
                    label="文字颜色"
                    shades={textShades}
                    hues={hues}
                    value={values.textColor}
                    fallback={TEXT_COLOR}
                    onPick={onPickColor('textColor')}
                  />

                  <FormField
                    control={form.control}
                    name="backdropBlur"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>背景模糊</FormLabel>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {field.value ?? 0}px
                            </span>
                          </div>
                          <FormControl>
                            <input
                              type="range"
                              min={0}
                              max={BLUR_MAX}
                              value={field.value ?? 0}
                              aria-label="背景模糊"
                              className="w-full accent-primary"
                              onChange={function (event) {
                                field.onChange(Number(event.target.value))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="backdropOpacity"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>背景透明</FormLabel>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {Math.round((field.value ?? 0) * 100)}%
                            </span>
                          </div>
                          <FormControl>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={field.value ?? 0}
                              aria-label="背景透明"
                              className="w-full accent-primary"
                              onChange={function (event) {
                                field.onChange(Number(event.target.value))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="image"
                    render={function ({ field }) {
                      return (
                        <FormItem>
                          <FormLabel>背景图片</FormLabel>
                          <div
                            role="radiogroup"
                            aria-label="背景图片"
                            className="flex items-center gap-2 overflow-x-auto pb-1">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={field.value === IMAGE_NONE}
                              aria-label="清空背景图"
                              className={cn(
                                IMAGE_SWATCH_CLASS,
                                'grid shrink-0 cursor-pointer place-items-center rounded-lg border-2 border-dashed text-[13px] font-medium text-muted-foreground transition-colors',
                                field.value === IMAGE_NONE
                                  ? 'border-primary text-primary'
                                  : 'border-border'
                              )}
                              onClick={function () {
                                updateKeptImageUrl(null)
                                field.onChange(IMAGE_NONE)
                              }}>
                              无
                            </button>
                            {isImagesLoading
                              ? Array.from({ length: PICSUM_LIMIT }).map(function (_, index) {
                                  return (
                                    <Skeleton
                                      key={index}
                                      className={cn(IMAGE_SWATCH_CLASS, 'shrink-0 rounded-lg')}
                                    />
                                  )
                                })
                              : images.map(function (image) {
                                  const thumbUrl = buildPicsumUrl(
                                    image,
                                    PICSUM_THUMB_WIDTH,
                                    PICSUM_THUMB_HEIGHT
                                  )
                                  const isSelected = field.value === image.id

                                  return (
                                    <button
                                      key={image.id}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      aria-label={`背景图片 ${image.id}`}
                                      className={cn(
                                        IMAGE_SWATCH_CLASS,
                                        'shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors',
                                        isSelected ? 'border-primary' : 'border-border'
                                      )}
                                      onClick={function () {
                                        updateKeptImageUrl(null)
                                        field.onChange(image.id)
                                      }}>
                                      <img
                                        src={thumbUrl}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                      />
                                    </button>
                                  )
                                })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      aria-busy={submitting}
                      disabled={submitting}>
                      {submitting ? <Spinner /> : null}
                      {isCreateMode ? '添加' : '保存'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Card>
        </div>

        <Preview
          watched={values}
          images={images}
          fallbackColor={themePrimary}
          keptImageUrl={keptImageUrl}
          component={component}
        />
      </div>
    </div>
  )
}
