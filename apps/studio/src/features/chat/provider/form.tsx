import { Button } from '@i-thinking/design/components/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@i-thinking/design/components/form'
import { Input } from '@i-thinking/design/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Switch } from '@i-thinking/design/components/switch'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Control, type ControllerRenderProps } from 'react-hook-form'

import { PROVIDER_KINDS } from '@/features/chat/provider/constants.ts'
import {
  formatModels,
  PROVIDER_SCHEMA,
  type ProviderValues
} from '@/features/chat/provider/schema.ts'

/** 主进程 provider 行的展示类型（渲染进程不 import 主进程类型） */
type ProviderRow = Awaited<ReturnType<typeof itc.chat.provider.toRead>>[number]

interface ProviderFormProps {
  provider: ProviderRow | null
  isSaving: boolean
  isUpdating: boolean
  submitLabel: string
  onSubmit: (values: ProviderValues) => void
  onCancel: () => void
}

function toDefaults(provider: ProviderRow | null): ProviderValues {
  return {
    kind: provider?.kind ?? PROVIDER_KINDS[0].value,
    name: provider?.name ?? '',
    baseUrl: provider?.baseUrl ?? PROVIDER_KINDS[0].baseUrl,
    model: provider?.model ?? '',
    models: formatModels(provider?.models ?? null),
    // 已存的 Key 不读回（主进程只有写/问有没有/删），留空表示不改
    apiKey: '',
    enabled: provider?.enabled ?? true
  }
}

function KeyField(props: {
  provider: ProviderRow | null
  field: ControllerRenderProps<ProviderValues, 'apiKey'>
}) {
  const [isVisible, updateVisible] = useState(false)
  const { field } = props

  return (
    <div className="relative">
      <Input
        {...field}
        type={isVisible ? 'text' : 'password'}
        autoComplete="off"
        className="pe-9"
        placeholder={props.provider ? '留空表示不修改' : '输入 API Key'}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute inset-e-0.5 top-1/2 -translate-y-1/2"
        aria-label={isVisible ? '隐藏 API Key' : '显示 API Key'}
        onClick={function () {
          updateVisible(function (current) {
            return !current
          })
        }}>
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}

function ApiKeyField(props: { control: Control<ProviderValues>; provider: ProviderRow | null }) {
  return (
    <FormField
      control={props.control}
      name="apiKey"
      render={function ({ field }) {
        return (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <KeyField
                provider={props.provider}
                field={field}
              />
            </FormControl>
            <FormDescription>
              旧密钥不会显示。留空表示不修改，填写后只写入主进程密钥库。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

function ProviderForm(props: ProviderFormProps) {
  const { provider, isSaving, isUpdating, submitLabel, onSubmit, onCancel } = props

  const form = useForm<ProviderValues>({
    resolver: zodResolver(PROVIDER_SCHEMA),
    defaultValues: toDefaults(provider)
  })

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}>
        {isUpdating ? (
          <ApiKeyField
            control={form.control}
            provider={provider}
          />
        ) : null}
        <FormField
          control={form.control}
          name="kind"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={function (value) {
                    field.onChange(value)
                    const next = PROVIDER_KINDS.find(function (item) {
                      return item.value === value
                    })
                    const current = form.getValues('baseUrl')
                    const isPreset = PROVIDER_KINDS.some(function (item) {
                      return item.baseUrl !== '' && item.baseUrl === current
                    })
                    if (next && (current === '' || isPreset)) {
                      form.setValue('baseUrl', next.baseUrl)
                    }
                  }}>
                  <FormControl>
                    <SelectTrigger aria-label="Provider">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROVIDER_KINDS.map(function (kind) {
                      return (
                        <SelectItem
                          key={kind.value}
                          value={kind.value}>
                          {kind.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="name"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>名称</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="本地 Ollama"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="baseUrl"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>服务地址</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="http://127.0.0.1:11434/v1"
                  />
                </FormControl>
                <FormDescription>
                  OpenAI 兼容根路径，要带 /v1（Ollama：http://127.0.0.1:11434/v1；LM Studio：
                  http://127.0.0.1:1234/v1）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="model"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>模型</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="qwen3:8b"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="models"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>可选用模型</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="qwen3:8b, llama3.2:3b"
                  />
                </FormControl>
                <FormDescription>逗号分隔，可留空</FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {isUpdating ? null : (
          <ApiKeyField
            control={form.control}
            provider={provider}
          />
        )}

        <FormField
          control={form.control}
          name="enabled"
          render={function ({ field }) {
            return (
              <FormItem className="flex flex-row items-center justify-between">
                <FormLabel>启用</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="启用"
                  />
                </FormControl>
              </FormItem>
            )
          }}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}>
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSaving}>
            {isSaving ? '保存中…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export { ProviderForm, type ProviderRow }
