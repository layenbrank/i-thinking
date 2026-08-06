import { Button, ColorPicker, Input, InputNumber, Space, Switch, Tabs } from 'antd'
import type { Color } from 'antd/es/color-picker'

import type { ThemeComponent, ThemeComponentKey } from '@/themes'
import { RECIPE_FIELDS, RECIPE_TABS, RECIPES, mergeComponents, type RecipeField, type RecipeTab } from '@/themes'

import styles from '@/features/magnetic-tiles/settings/theme-recipe-form.module.scss'

interface ThemeRecipeFormProps {
  components: ThemeComponent
  onChange: (components: ThemeComponent) => void
}

const TAB_LABELS: Record<RecipeTab, string> = {
  layout: '布局',
  navigation: '导航',
  form: '表单',
  dataDisplay: '展示',
  feedback: '反馈'
}

function findRecipeDefault(component: ThemeComponentKey, token: string): unknown {
  const bucket = RECIPES[component]
  if (!bucket || typeof bucket !== 'object') {
    return undefined
  }
  return (bucket)[token]
}

function readFieldValue(components: ThemeComponent, field: RecipeField): unknown {
  const bucket = components[field.component]
  if (!bucket || typeof bucket !== 'object') {
    return undefined
  }
  return (bucket)[field.token]
}

function patchField(
  components: ThemeComponent,
  field: RecipeField,
  value: unknown | undefined
): ThemeComponent {
  if (value === undefined) {
    const bucket = components[field.component]
    if (!bucket || typeof bucket !== 'object') {
      return components
    }
    const rest = { ...(bucket) }
    delete rest[field.token]
    if (Object.keys(rest).length === 0) {
      const next = { ...components }
      delete next[field.component]
      return next
    }
    return mergeComponents(components, { [field.component]: rest })
  }
  return mergeComponents(components, { [field.component]: { [field.token]: value } })
}

function renderFieldControl(
  field: RecipeField,
  value: unknown,
  onFieldChange: (value: unknown) => void
) {
  if (field.type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onChange={function (checked) {
          onFieldChange(checked)
        }}
      />
    )
  }
  if (field.type === 'number') {
    return (
      <InputNumber
        value={typeof value === 'number' ? value : undefined}
        onChange={function (next) {
          onFieldChange(next ?? undefined)
        }}
      />
    )
  }
  if (field.type === 'string') {
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={function (event) {
          const next = event.target.value
          onFieldChange(next.length > 0 ? next : undefined)
        }}
      />
    )
  }
  return (
    <ColorPicker
      value={typeof value === 'string' ? value : undefined}
      onChangeComplete={function (color: Color) {
        onFieldChange(color.toHexString())
      }}
    />
  )
}

export default function ThemeRecipeForm(props: ThemeRecipeFormProps) {
  function onResetField(field: RecipeField) {
    const defaultValue = findRecipeDefault(field.component, field.token)
    props.onChange(patchField(props.components, field, defaultValue))
  }

  const tabItems = RECIPE_TABS.map(function (tab: RecipeTab) {
    const fields = RECIPE_FIELDS[tab]
    return {
      key: tab,
      label: TAB_LABELS[tab],
      children: (
        <div className={styles.fieldList}>
          {fields.map(function (field) {
            const value = readFieldValue(props.components, field)
            return (
              <div
                key={`${field.component}.${field.token}`}
                className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <Space>
                  {renderFieldControl(field, value, function (next) {
                    props.onChange(patchField(props.components, field, next))
                  })}
                  <Button
                    type="link"
                    size="small"
                    className="cursor-pointer"
                    onClick={function () {
                      onResetField(field)
                    }}>
                    恢复预设
                  </Button>
                </Space>
              </div>
            )
          })}
        </div>
      )
    }
  })

  return (
    <Tabs
      size="small"
      items={tabItems}
    />
  )
}
