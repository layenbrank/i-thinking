import { Icon } from '@iconify/react'
import { ColorPicker, Slider, Tooltip, Row, Col, Divider, theme } from 'antd'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { generate, presetPalettes } from '@ant-design/colors'

import type { ColorPickerProps } from 'antd'

import styles from '@/views/screenshot/components/utility.module.scss'

type Presets = Required<ColorPickerProps>['presets'][number]

export type UtilityEnum =
  | 'select'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'freehand'
  | 'mosaic'
  | 'number'
  | 'highlight'
  | 'spotlight'
  | 'blur'

interface UtilityOption {
  type: UtilityEnum
  label: string
  icon: string
}

interface UtilityProps {
  rect: { x: number; y: number; w: number; h: number }
  active: UtilityEnum
  color: string
  thickness: number
  canUndo: boolean
  canRedo: boolean
  onUpdateUtility: (utility: UtilityEnum) => void
  onUpdateColor: (color: string) => void
  onUpdateThickness: (thickness: number) => void
  onUndo: () => void
  onRedo: () => void
  onPreserve: () => void
  onCopy: () => void
  onPin: () => void
  onClose: () => void
  onRefresh: () => void
}

const UTILITIES: UtilityOption[] = [
  { type: 'rect', label: '矩形', icon: 'mdi:rectangle-outline' },
  { type: 'ellipse', label: '圆形', icon: 'mdi:circle-outline' },
  { type: 'arrow', label: '箭头', icon: 'mdi:arrow-top-right-thin' },
  { type: 'line', label: '线条', icon: 'mdi:minus' },
  { type: 'text', label: '文字', icon: 'mdi:format-text' },
  { type: 'freehand', label: '画笔', icon: 'mdi:draw' },
  { type: 'mosaic', label: '马赛克', icon: 'mdi:meteor' },
  { type: 'number', label: '序号', icon: 'mdi:numeric' },
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
    thickness,
    onClose,
    onUpdateColor,
    onCopy,
    onPin,
    onRedo,
    onRefresh,
    onPreserve,
    onUpdateThickness,
    onUndo,
    onUpdateUtility
  } = props

  const { token } = theme.useToken()

  // const [visible, onUpdateVisible] = useState(false)
  const visible = active !== 'select'
  const [pickerOpen, setPickerOpen] = useState(false)
  const isCustomColor = !COLORS.some((c) => c.toUpperCase() === color.toUpperCase())

  const presets = genPresets({
    primary: generate(token.colorPrimary),
    red: generate('#ff0000'),
    green: generate('#008000'),
    cyan: generate('#00ffff')
  })

  return (
    <motion.div
      className={styles.utility}
      style={{
        top: 0,
        left: 0,
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
                    onUpdateUtility(utility.type)
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
          <Tooltip title="复制">
            <motion.button
              className={styles.button}
              whileTap={{ scale: 0.9 }}
              onClick={onCopy}>
              <Icon
                icon="mdi:content-copy"
                width={18}
                height={18}
              />
            </motion.button>
          </Tooltip>
          <Tooltip title="保存">
            <motion.button
              className={clsx(styles.button, styles.primary)}
              whileTap={{ scale: 0.9 }}
              onClick={onPreserve}>
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
                    className={clsx(styles.color, { [styles.active]: isCustomColor })}
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
                        width={14}
                        height={14}
                      />
                    )}
                  </motion.button>
                </Tooltip>
              </ColorPicker>
            </div>
            <div className={styles.separator} />
            <div className={clsx(styles.ensemble, 'flex-1')}>
              <Slider
                className={clsx(styles.thickness)}
                defaultValue={thickness}
                onChange={(v) => onUpdateThickness(Math.round(v))}
                step={0.01}
                min={1}
                max={16}
                tooltip={{
                  formatter: (v) => Math.round(v ?? 1)
                }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
