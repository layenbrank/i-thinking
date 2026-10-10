import { Icon } from '@iconify/react/offline'
import { Popover, PopoverContent, PopoverTrigger } from '@i-thinking/design/components/popover'
import { Separator } from '@i-thinking/design/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Glide } from '@/components/glide/glide'
import {
  generateDerivedShades,
  normalizeHex,
  parsePresetHues
} from '@/features/capture/components/colors'
import { type GraphicsEnum } from '@/features/capture/components/graphics'

import styles from '@/features/capture/components/utility.module.scss'

interface UtilityOption {
  type: GraphicsEnum
  label: string
  icon: string
}

interface UtilityProps {
  selection: { x: number; y: number; w: number; h: number } | null
  active: GraphicsEnum | null
  color: string
  thickness: number
  filled: boolean
  opacity: number
  fontSize: number
  canUndo: boolean
  canRedo: boolean
  onUpdateUtility: (shape: GraphicsEnum | null) => void
  onUpdateColor: (color: string) => void
  onUpdateThickness: (thickness: number) => void
  onUpdateFilled: (filled: boolean) => void
  onUpdateOpacity: (opacity: number) => void
  onUpdateFontSize: (fontSize: number) => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPin: () => void
  onSave: () => void
  onClose: () => void
  onRefresh: () => void
}

/** 支持「填充」开关的形状（仅闭合矩形/椭圆） */
const FILLABLE_GRAPHICS = new Set<GraphicsEnum>(['rect', 'ellipse'])
/** 支持「字号」滑块的形状 */
const FONTSIZE_GRAPHICS = new Set<GraphicsEnum>(['text', 'index'])
/** 不参与透明度调整的形状（模糊/马赛克/聚光灯的视觉语义不应被改） */
const NON_OPACITY_GRAPHICS = new Set<GraphicsEnum>(['mosaic', 'blur', 'spotlight'])
/** 主题主色锚点：取应用默认主色（与 capture 默认标注色一致） */
const THEME_PRIMARY = '#4080ff'

const UTILITIES: UtilityOption[] = [
  { type: 'rect', label: '矩形', icon: 'mdi:rectangle-outline' },
  { type: 'ellipse', label: '圆形', icon: 'mdi:circle-outline' },
  { type: 'arrow', label: '箭头', icon: 'mdi:arrow-top-right-thin' },
  { type: 'line', label: '线条', icon: 'mdi:minus' },
  { type: 'text', label: '文字', icon: 'mdi:format-text' },
  { type: 'freehand', label: '画笔', icon: 'mdi:draw' },
  { type: 'mosaic', label: '马赛克', icon: 'mdi:meteor' },
  { type: 'index', label: '序号', icon: 'mdi:numeric' },
  { type: 'highlight', label: '荧光笔', icon: 'mdi:marker' },
  { type: 'blur', label: '模糊', icon: 'mdi:blur' },
  { type: 'spotlight', label: '聚光灯', icon: 'mdi:spotlight' }
]

export default function Utility(props: UtilityProps) {
  const {
    active,
    canRedo,
    canUndo,
    color,
    filled,
    fontSize,
    opacity,
    selection,
    thickness,
    onUpdateColor,
    onUpdateFilled,
    onUpdateFontSize,
    onUpdateOpacity,
    onRedo,
    onRefresh,
    onCopy,
    onPin,
    onSave,
    onUpdateThickness,
    onUndo,
    onUpdateUtility
  } = props

  // 主色锚点：点击预设色板时写入；衍生色 / 自定义色不改锚点
  const [pinnedMainColor, setPinnedMainColor] = useState(color)

  // 属性面板开合：仅在选中工具后展开（不再独立使用 visible state）
  const visible = active !== null
  const showFilled = active !== null && active !== undefined && FILLABLE_GRAPHICS.has(active)
  const showFontSize = active !== null && active !== undefined && FONTSIZE_GRAPHICS.has(active)
  const showOpacity = active !== null && active !== undefined && !NON_OPACITY_GRAPHICS.has(active)
  const [pickerOpen, setPickerOpen] = useState(false)

  // 平铺预设色相：弹层色板数据源（主色锚点固定，弹层开合不重算）
  const presetHues = useMemo(function () {
    return parsePresetHues(THEME_PRIMARY)
  }, [])

  // 外部 color 若本身是预设主色（如切换选中对象），直接用作主色；否则沿用锚点
  const presetMatch = useMemo(
    function () {
      return (
        presetHues.find(function (c) {
          return c.toUpperCase() === color.toUpperCase()
        }) ?? null
      )
    },
    [color, presetHues]
  )
  const mainColor = presetMatch ?? pinnedMainColor

  // 衍生色阶：随 mainColor 重算（选衍生色 / 自定义时不会整段变化）
  const derivedShades = useMemo(
    function () {
      return generateDerivedShades(mainColor)
    },
    [mainColor]
  )

  // 自定义颜色判定：color 不在预设主色也不在衍生色阶中即为自定义
  const isCustomColor =
    !presetHues.some((c) => c.toUpperCase() === color.toUpperCase()) &&
    !derivedShades.some((c) => c.toUpperCase() === color.toUpperCase())

  // 工具栏跟随选区下沿定位：位置嵌下区域时翻到上沿；右贴边时水平内收
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useLayoutEffect(
    function () {
      if (!selection) return
      const node = containerRef.current
      if (!node) return
      const GAP = 8
      const rect = node.getBoundingClientRect()
      const W = window.innerWidth
      const H = window.innerHeight
      let top = selection.y + selection.h + GAP
      // 下方装不下 → 翻到上沿；仍装不下 → 区域内部底部对齐
      if (top + rect.height + GAP > H) {
        const above = selection.y - rect.height - GAP
        top = above >= GAP ? above : Math.max(GAP, H - rect.height - GAP)
      }
      let left = selection.x
      if (left + rect.width + GAP > W) left = W - rect.width - GAP
      if (left < GAP) left = GAP
      setPosition(function (prev) {
        if (prev.top === top && prev.left === left) return prev
        return { top, left }
      })
    },
    [selection, active]
  )

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          ref={containerRef}
          className={styles.utility}
          style={{
            top: position.top,
            left: position.left,
            pointerEvents: 'all'
          }}
          initial={{
            y: 6,
            opacity: 0,
            scale: 0.97
          }}
          animate={{
            y: 0,
            scale: 1,
            opacity: 1
          }}
          exit={{
            y: 4,
            opacity: 0,
            scale: 0.98
          }}
          transition={{
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1]
          }}
          onMouseDown={function (e) {
            e.stopPropagation()
          }}>
          {/* 工具按钮 */}
          <div className={styles.row}>
            <div className={styles.ensemble}>
              {UTILITIES.map(function (utility) {
                return (
                  <Tooltip key={utility.type}>
                    <TooltipTrigger
                      render={
                        <motion.button
                          type="button"
                          className={clsx(styles.button, {
                            [styles.active]: active === utility.type
                          })}
                          whileTap={{ scale: 0.9 }}
                          onClick={function () {
                            onUpdateUtility(active === utility.type ? null : utility.type)
                          }}
                        />
                      }>
                      <Icon
                        icon={utility.icon}
                        width={18}
                        height={18}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{utility.label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            <div className={styles.separator} />

            {/* 操作按钮 */}
            <div className={styles.ensemble}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      disabled={!canUndo}
                      whileTap={{ scale: 0.9 }}
                      onClick={onUndo}
                    />
                  }>
                  <Icon
                    icon="mdi:undo-variant"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>撤销 Ctrl+Z</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      disabled={!canRedo}
                      whileTap={{ scale: 0.9 }}
                      onClick={onRedo}
                    />
                  }>
                  <Icon
                    icon="mdi:redo-variant"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>重做 Ctrl+Y</TooltipContent>
              </Tooltip>
            </div>

            <div className={styles.separator} />

            <div className={styles.ensemble}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      whileTap={{ scale: 0.9 }}
                      onClick={onRefresh}
                    />
                  }>
                  <Icon
                    icon="mdi:refresh"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>重选</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      whileTap={{ scale: 0.9 }}
                      onClick={onCopy}
                    />
                  }>
                  <Icon
                    icon="mdi:content-copy"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>复制</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      whileTap={{ scale: 0.9 }}
                      onClick={onPin}
                    />
                  }>
                  <Icon
                    icon="mdi:pin"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>贴图</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <motion.button
                      type="button"
                      className={styles.button}
                      whileTap={{ scale: 0.9 }}
                      onClick={onSave}
                    />
                  }>
                  <Icon
                    icon="mdi:content-save-outline"
                    width={18}
                    height={18}
                  />
                </TooltipTrigger>
                <TooltipContent>保存</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 属性面板（横向：取色入口 + 滑块控件） */}
          <AnimatePresence>
            {visible && (
              <motion.div
                className={styles.row}
                initial={{
                  height: 0,
                  opacity: 0
                }}
                animate={{
                  opacity: 1,
                  height: 'auto'
                }}
                exit={{
                  height: 0,
                  opacity: 0
                }}
                transition={{
                  duration: 0.15
                }}>
                {/* 调色/自定义颜色入口：与滑块控件同行，色板与取色器收在弹层内 */}
                <Popover
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}>
                  <Tooltip open={pickerOpen ? false : undefined}>
                    <TooltipTrigger
                      render={
                        <PopoverTrigger
                          render={
                            <motion.button
                              type="button"
                              className={clsx(styles.color, styles.palette, {
                                // 选中自定义色或弹层展开：同一套环形高亮
                                [styles.active]: isCustomColor || pickerOpen
                              })}
                              whileTap={{ scale: 0.85 }}
                              animate={{ scale: pickerOpen ? 1.1 : 1 }}
                              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                              style={{ background: isCustomColor ? color : 'transparent' }}
                            />
                          }
                        />
                      }>
                      {!isCustomColor && (
                        <Icon
                          icon="mdi:palette-outline"
                          width={18}
                          height={18}
                        />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>自定义颜色</TooltipContent>
                  </Tooltip>
                  <PopoverContent
                    align="start"
                    className="w-auto">
                    <div className={styles.panelStack}>
                      {/* 预设色板：单行横向滚动，不换行不分组 */}
                      <Glide.X
                        classNames={{
                          root: styles.presetRow,
                          inner: styles.presetTrack
                        }}>
                        {presetHues.map(function (value) {
                          return (
                            <button
                              key={value}
                              type="button"
                              title={value}
                              className={clsx(styles.color, {
                                [styles.active]: mainColor.toUpperCase() === value.toUpperCase()
                              })}
                              onClick={() => {
                                setPinnedMainColor(value)
                                onUpdateColor(value)
                              }}
                              style={{
                                background: value
                              }}
                            />
                          )
                        })}
                      </Glide.X>
                      <Separator />
                      {/* 取色器：原生 color input 自绘（不支持 alpha） */}
                      <input
                        type="color"
                        aria-label="自定义颜色"
                        value={color}
                        className="border-border bg-background h-7 w-full cursor-pointer rounded-md border p-0.5"
                        onChange={function (event) {
                          onUpdateColor(normalizeHex(event.target.value))
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 衍生色阶：浅色 → 主色 → 深色，紧凑单行平铺 */}
                <div className={styles.shades}>
                  {derivedShades.map(function (value) {
                    return (
                      <button
                        key={value}
                        title={value}
                        className={clsx(styles.shade, {
                          [styles.active]: color.toUpperCase() === value.toUpperCase()
                        })}
                        onClick={() => onUpdateColor(value)}
                        style={{
                          background: value
                        }}
                      />
                    )
                  })}
                </div>

                <div className={styles.separator} />

                {/* 控件区：粗细 / 填充 / 字号 / 透明度 */}
                <div
                  className={clsx(styles.ensemble, styles.compact)}
                  title={`粗细 ${Math.round(thickness)}`}>
                  <Icon
                    icon="mdi:format-line-weight"
                    width={14}
                    height={14}
                  />
                  <input
                    type="range"
                    className={styles.thickness}
                    min={1}
                    max={16}
                    step={1}
                    value={thickness}
                    aria-label="粗细"
                    onChange={function (event) {
                      onUpdateThickness(Math.round(Number(event.target.value)))
                    }}
                  />
                </div>

                {/* 填充开关：仅闭合形状（rect / ellipse） */}
                {showFilled && (
                  <>
                    <div className={styles.separator} />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <motion.button
                            type="button"
                            className={clsx(styles.button, { [styles.active]: filled })}
                            whileTap={{ scale: 0.9 }}
                            onClick={function () {
                              onUpdateFilled(!filled)
                            }}
                          />
                        }>
                        <Icon
                          icon={filled ? 'mdi:format-color-fill' : 'mdi:format-color-highlight'}
                          width={18}
                          height={18}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{filled ? '取消填充' : '填充'}</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {/* 字号滑块：文本/序号 */}
                {showFontSize && (
                  <>
                    <div className={styles.separator} />
                    <div
                      className={clsx(styles.ensemble, styles.compact)}
                      title={`字号 ${Math.round(fontSize)}`}>
                      <Icon
                        icon="mdi:format-size"
                        width={14}
                        height={14}
                      />
                      <input
                        type="range"
                        className={styles.fontSize}
                        min={10}
                        max={64}
                        step={1}
                        value={fontSize}
                        aria-label="字号"
                        onChange={function (event) {
                          onUpdateFontSize(Math.round(Number(event.target.value)))
                        }}
                      />
                    </div>
                  </>
                )}

                {/* 透明度滑块：除模糊/马赛克/聚光灯之外 */}
                {showOpacity && (
                  <>
                    <div className={styles.separator} />
                    <div
                      className={clsx(styles.ensemble, styles.compact)}
                      title={`不透明度 ${Math.round(opacity * 100)}%`}>
                      <Icon
                        icon="mdi:opacity"
                        width={14}
                        height={14}
                      />
                      <input
                        type="range"
                        className={styles.opacity}
                        min={5}
                        max={100}
                        step={1}
                        value={Math.round(opacity * 100)}
                        aria-label="不透明度"
                        onChange={function (event) {
                          onUpdateOpacity(Math.max(0.05, Number(event.target.value) / 100))
                        }}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
