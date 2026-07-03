import { generate, presetPalettes } from '@ant-design/colors'
import clsx from 'clsx'
import {
  Button,
  ColorPicker,
  InputNumber,
  message,
  Radio,
  Segmented,
  Slider,
  Space,
  Typography
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import { useMemo } from 'react'

import ThemePreview from '@/features/applications/settings/theme-preview'
import {
  exportAppearanceFile,
  importAppearanceFile
} from '@/features/applications/settings/theme-io'
import ThemeRecipeForm from '@/features/applications/settings/theme-recipe-form'
import { useSettingsStore } from '@/stores/setting'
import {
  PROVIDER_VARIANTS,
  type Appearance,
  type ProviderVariant,
  type ThemeDensity,
  type ThemeMode
} from '@/themes'

import styles from '@/features/applications/settings/panels/appearance.module.scss'

const APPEARANCE_MODE_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
] satisfies { label: string; value: ThemeMode }[]

const APPEARANCE_DENSITY_OPTIONS = [
  { label: '默认', value: 'default' },
  { label: '紧凑', value: 'compact' }
] satisfies { label: string; value: ThemeDensity }[]

const APPEARANCE_SIZE_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'middle' },
  { label: '大', value: 'large' }
]

const APPEARANCE_VARIANT_OPTIONS = PROVIDER_VARIANTS.map(function (value) {
  return { label: value, value }
})

function AppearancePanel() {
  const appearance = useSettingsStore(function (state) {
    return state.settings.appearance
  })
  const update = useSettingsStore(function (state) {
    return state.update
  })
  const resetAppearance = useSettingsStore(function (state) {
    return state.resetAppearance
  })

  const colorPresets = useMemo(function () {
    return Object.entries(presetPalettes).map(function ([label, colors]) {
      return {
        label,
        colors,
        key: label
      }
    })
  }, [])

  const primaryPresets = useMemo(
    function () {
      return [
        {
          label: 'primary',
          colors: generate(appearance.color),
          key: 'primary'
        }
      ]
    },
    [appearance.color]
  )

  function mergeAppearance(patch: Partial<Appearance>) {
    void update('appearance', patch)
  }

  async function onExport() {
    try {
      await exportAppearanceFile(appearance)
      message.success('主题已导出')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    }
  }

  async function onImport() {
    try {
      const parsed = await importAppearanceFile()
      if (!parsed) return
      await update('appearance', parsed)
      message.success('主题已导入')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败')
    }
  }

  async function onReset() {
    await resetAppearance()
    message.success('已恢复默认主题')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <Typography.Text className={styles.cardTitle}>基础外观</Typography.Text>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>外观模式</Typography.Text>
          <div className={styles.fieldControl}>
            <Segmented
              options={APPEARANCE_MODE_OPTIONS}
              value={appearance.theme}
              onChange={function (value) {
                mergeAppearance({ theme: value as ThemeMode })
              }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>品牌主色</Typography.Text>
          <div className={styles.fieldControl}>
            <ColorPicker
              value={appearance.color}
              presets={[...primaryPresets, ...colorPresets]}
              onChangeComplete={function (value: Color) {
                mergeAppearance({ color: value.toHexString() })
              }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>密度</Typography.Text>
          <div className={styles.fieldControl}>
            <Radio.Group
              options={APPEARANCE_DENSITY_OPTIONS}
              value={appearance.density}
              onChange={function (event) {
                mergeAppearance({ density: event.target.value as ThemeDensity })
              }}
              optionType="button"
              buttonStyle="solid"
            />
          </div>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>组件尺寸</Typography.Text>
          <div className={styles.fieldControl}>
            <Segmented
              options={APPEARANCE_SIZE_OPTIONS}
              value={appearance.size ?? 'middle'}
              onChange={function (value) {
                mergeAppearance({ size: value as Appearance['size'] })
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <Typography.Text className={styles.cardTitle}>组件样式</Typography.Text>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>组件变体</Typography.Text>
          <div className={styles.fieldControl}>
            <Segmented
              options={APPEARANCE_VARIANT_OPTIONS}
              value={appearance.variant as ProviderVariant}
              onChange={function (value) {
                mergeAppearance({ variant: value as ProviderVariant })
              }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>圆角</Typography.Text>
          <div className={clsx(styles.fieldControl, styles.sliderRow)}>
            <Slider
              min={2}
              max={16}
              value={appearance.radius}
              onChange={function (value) {
                mergeAppearance({ radius: value })
              }}
            />

            <InputNumber
              min={2}
              max={16}
              mode="spinner"
              value={appearance.radius}
              onChange={function (value) {
                if (typeof value === 'number') mergeAppearance({ radius: value })
              }}
            />
          </div>
        </div>

        <div className={styles.field}>
          <Typography.Text className={styles.fieldLabel}>字号</Typography.Text>
          <div className={clsx(styles.fieldControl, styles.sliderRow)}>
            <Slider
              min={12}
              max={18}
              value={appearance.fontSize}
              onChange={function (value) {
                mergeAppearance({ fontSize: value })
              }}
            />
            <InputNumber
              min={12}
              max={18}
              mode="spinner"
              value={appearance.fontSize}
              onChange={function (value) {
                if (typeof value === 'number') mergeAppearance({ fontSize: value })
              }}
            />
          </div>
        </div>
      </div>

      <div className={clsx(styles.card, styles.cardStack)}>
        <Typography.Text className={styles.cardTitle}>组件配方</Typography.Text>
        <ThemeRecipeForm
          components={appearance.components}
          onChange={function (components) {
            mergeAppearance({ components })
          }}
        />
      </div>

      <div className={clsx(styles.card, styles.previewCard)}>
        <Typography.Text className={styles.cardTitle}>实时预览</Typography.Text>
        <ThemePreview appearance={appearance} />
      </div>

      <Space className={styles.actions}>
        <Button
          className="cursor-pointer"
          onClick={function () {
            void onReset()
          }}>
          重置
        </Button>
        <Button
          className="cursor-pointer"
          onClick={function () {
            void onExport()
          }}>
          导出 JSON
        </Button>
        <Button
          className="cursor-pointer"
          onClick={function () {
            void onImport()
          }}>
          导入 JSON
        </Button>
      </Space>
    </div>
  )
}

export default AppearancePanel
