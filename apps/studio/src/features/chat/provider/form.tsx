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
import { useForm } from 'react-hook-form'

import { PROVIDER_KINDS } from '@/features/chat/provider/constants.ts'
import {
  formatModels,
  PROVIDER_SCHEMA,
  type ProviderValues
} from '@/features/chat/provider/schema.ts'

import styles from '@/features/chat/provider/dialog.module.scss'

/** 主进程 provider 行的展示类型（渲染进程不 import 主进程类型） */
type ProviderRow = Awaited<ReturnType<typeof itc.chat.provider.toRead>>[number]

interface ProviderFormProps {
  provider: ProviderRow | null
  isSaving: boolean
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

function ProviderForm(props: ProviderFormProps) {
  const { provider, isSaving, onSubmit, onCancel } = props

  const form = useForm<ProviderValues>({
    resolver: zodResolver(PROVIDER_SCHEMA),
    defaultValues: toDefaults(provider)
  })

  return (
    <Form {...form}>
      <form
        noValidate
        className={styles.form}
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="kind"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>类型</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-label="类型">
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
                    placeholder="http://127.0.0.1:11434"
                  />
                </FormControl>
                <FormDescription>OpenAI 兼容端点（含 /v1 前缀视服务而定）</FormDescription>
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
                <FormLabel>默认模型</FormLabel>
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

        <FormField
          control={form.control}
          name="apiKey"
          render={function ({ field }) {
            return (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="off"
                    placeholder={provider ? '留空表示不修改' : '本地服务通常不需要'}
                  />
                </FormControl>
                <FormDescription>只写入主进程密钥库，不会再读回界面</FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={function ({ field }) {
            return (
              <FormItem className={styles.inlineItem}>
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

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}>
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSaving}>
            {isSaving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export { ProviderForm, type ProviderRow }
