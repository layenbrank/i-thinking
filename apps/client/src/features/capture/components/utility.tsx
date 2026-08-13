import { generate, presetPalettes } from '@ant-design/colors'
import { Icon } from '@iconify/react/offline'
import { Col, ColorPicker, Divider, Row, Slider, theme, Tooltip } from 'antd'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { ColorPickerProps } from 'antd'

import { type GraphicsEnum } from '@/features/capture/components/graphics'

import styles from '@/features/capture/components/utility.module.scss'

type Presets = Required<ColorPickerProps>['presets'][number]

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

const COLORS = [
  '#FF0000',
  '#FF6B00',
  '#FFAB00',
  '#00C853',
  '#4080FF',
  '#7C4DFF',
  '#FFFFFF',
  '#000000'
]

function genPresets(presets = presetPalettes) {
  const entries = Object.entries(presets)
  return entries.map<Presets>(([label, colors]) => ({ label, colors, key: label }))
}

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
    onClose,
    onUpdateColor,
    onUpdateFilled,
    onUpdateFontSize,
    onUpdateOpacity,
    onRedo,
    onRefresh,
    onPin,
    onSave,
    onUpdateThickness,
    onUndo,
    onUpdateUtility
  } = props

  const { token } = theme.useToken()

  // 属性面板开合：仅在选中工具后展开（不再独立使用 visible state）
  const visible = active !== null
  const showFilled = (active !== null && active !== undefined) && FILLABLE_GRAPHICS.has(active)
  const showFontSize = (active !== null && active !== undefined) && FONTSIZE_GRAPHICS.has(active)
  const showOpacity = (active !== null && active !== undefined) && !NON_OPACITY_GRAPHICS.has(active)
  const [pickerOpen, setPickerOpen] = useState(false)
  const isCustomColor = !COLORS.some((c) => c.toUpperCase() === color.toUpperCase())

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
      setPosition({ top, left })
    },
    [selection, active]
  )

  const presets = useMemo(
    function () {
      return genPresets({
        primary: generate(token.colorPrimary),
        red: generate('#ff0000'),
        green: generate('#008000'),
        cyan: generate('#00ffff')
      })
    },
    [token.colorPrimary]
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
                  <Tooltip
                    title={utility.label}
                    key={utility.type}>
                    <motion.button
                      className={clsx(styles.button, {
                        [styles.active]: active === utility.type
                      })}
                      whileTap={{ scale: 0.9 }}
                      onClick={function () {
                        onUpdateUtility(active === utility.type ? null : utility.type)
                      }}>
                      <Icon
                        icon={utility.icon}
                        width={18}
                        height={18}
                      />
                    </motion.button>
                  </Tooltip>
                )
              })}
            </div>

            <div className={styles.separator} />

            {/* 操作按钮 */}
            <div className={styles.ensemble}>
              <Tooltip title="撤销 Ctrl+Z">
                <motion.button
                  className={styles.button}
                  title="撤销 Ctrl+Z"
                  disabled={!canUndo}
                  whileTap={{ scale: 0.9 }}
                  onClick={onUndo}>
                  <Icon
                    icon="mdi:undo-variant"
                    width={18}
                    height={18}
                  />
                </motion.button>
              </Tooltip>
              <Tooltip title="重做 Ctrl+Y">
                <motion.button
                  className={styles.button}
                  disabled={!canRedo}
                  whileTap={{ scale: 0.9 }}
                  onClick={onRedo}>
                  <Icon
                    icon="mdi:redo-variant"
                    width={18}
                    height={18}
                  />
                </motion.button>
              </Tooltip>
            </div>

            <div className={styles.separator} />

            <div className={styles.ensemble}>
              <Tooltip title="重选">
                <motion.button
                  className={styles.button}
                  whileTap={{ scale: 0.9 }}
                  onClick={onRefresh}>
                  <Icon
                    icon="mdi:refresh"
                    width={18}
                    height={18}
                  />
                </motion.button>
              </Tooltip>
              <Tooltip title="贴图">
                <motion.button
                  className={styles.button}
                  whileTap={{ scale: 0.9 }}
                  onClick={onPin}>
                  <Icon
                    icon="mdi:pin"
                    width={18}
                    height={18}
                  />
                </motion.button>
              </Tooltip>
              <Tooltip title="保存">
                <motion.button
                  className={clsx(styles.button, styles.primary)}
                  whileTap={{ scale: 0.9 }}
                  onClick={onSave}>
                  <Icon
                    icon="mdi:content-save-outline"
                    width={18}
                    height={18}
                  />
                </motion.button>
              </Tooltip>
            </div>
          </div>

          {/* 属性面板（颜色 + 粗细） */}
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
                <div className={styles.ensemble}>
                  {COLORS.map(function (value) {
                    return (
                      <button
                        key={value}
                        className={clsx(styles.color, {
                          [styles.active]: color.toUpperCase() === value.toUpperCase()
                        })}
                        onClick={() => onUpdateColor(value)}
                        style={{
                          background: value
                        }}
                      />
                    )
                  })}
                  <ColorPicker
                    onOpenChange={setPickerOpen}
                    value={color}
                    disabledAlpha
                    trigger="click"
                    presets={presets}
                    panelRender={function (panel, extra) {
                      const { Picker, Presets } = extra.components
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
                    }}
                    onChange={(c) => onUpdateColor(c.toHexString().toUpperCase())}>
                    <Tooltip title="自定义颜色">
                      <motion.button
                        className={clsx(styles.color, styles.palette, {
                          [styles.active]: isCustomColor
                        })}
                        whileTap={{ scale: 0.85 }}
                        animate={{
                          scale: pickerOpen ? 1.1 : 1,
                          outline: pickerOpen ? '2px solid #1677ff' : '2px solid transparent'
                        }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          background: isCustomColor ? color : 'transparent',
                          color: isCustomColor ? undefined : 'currentColor'
                        }}>
                        {!isCustomColor && (
                          <Icon
                            icon="mdi:palette-outline"
                            width={18}
                            height={18}
                          />
                        )}
                      </motion.button>
                    </Tooltip>
                  </ColorPicker>
                </div>
                <div className={styles.separator} />
                <Tooltip title={`粗细 ${Math.round(thickness)}`}>
                  <div className={clsx(styles.ensemble, styles.compact)}>
                    <Icon
                      icon="mdi:format-line-weight"
                      width={14}
                      height={14}
                    />
                    <Slider
                      className={clsx(styles.thickness)}
                      value={thickness}
                      onChange={(v) => onUpdateThickness(Math.round(v))}
                      step={0.01}
                      min={1}
                      max={16}
                      tooltip={{ open: false }}
                      styles={{
                        track: {
                          backgroundImage: 'linear-gradient(180deg, #91caff, #1677ff)'
                        },
                        handle: {
                          borderColor: '#1677ff',
                          boxShadow: '0 2px 8px #1677ff',
                          willChange: 'transform'
                        }
                      }}
                    />
                  </div>
                </Tooltip>

                {/* 填充开关：仅闭合形状（rect / ellipse） */}
                {showFilled && (
                  <>
                    <div className={styles.separator} />
                    <Tooltip title={filled ? '取消填充' : '填充'}>
                      <motion.button
                        className={clsx(styles.button, { [styles.active]: filled })}
                        whileTap={{ scale: 0.9 }}
                        onClick={function () {
                          onUpdateFilled(!filled)
                        }}>
                        <Icon
                          icon={filled ? 'mdi:format-color-fill' : 'mdi:format-color-highlight'}
                          width={18}
                          height={18}
                        />
                      </motion.button>
                    </Tooltip>
                  </>
                )}

                {/* 字号滑块：文本/序号 */}
                {showFontSize && (
                  <>
                    <div className={styles.separator} />
                    <Tooltip title={`字号 ${Math.round(fontSize)}`}>
                      <div className={clsx(styles.ensemble, styles.compact)}>
                        <Icon
                          icon="mdi:format-size"
                          width={14}
                          height={14}
                        />
                        <Slider
                          className={clsx(styles.fontSize)}
                          value={fontSize}
                          onChange={(v) => onUpdateFontSize(Math.round(v))}
                          step={1}
                          min={10}
                          max={64}
                          tooltip={{ open: false }}
                        />
                      </div>
                    </Tooltip>
                  </>
                )}

                {/* 透明度滑块：除模糊/马赛克/聚光灯之外 */}
                {showOpacity && (
                  <>
                    <div className={styles.separator} />
                    <Tooltip title={`不透明度 ${Math.round(opacity * 100)}%`}>
                      <div className={clsx(styles.ensemble, styles.compact)}>
                        <Icon
                          icon="mdi:opacity"
                          width={14}
                          height={14}
                        />
                        <Slider
                          className={clsx(styles.opacity)}
                          value={Math.round(opacity * 100)}
                          onChange={(v) => onUpdateOpacity(Math.max(0.05, v / 100))}
                          step={1}
                          min={5}
                          max={100}
                          tooltip={{ open: false }}
                        />
                      </div>
                    </Tooltip>
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
