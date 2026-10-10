import { Icon } from '@iconify/react/offline'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@i-thinking/design/components/form'
import { Input } from '@i-thinking/design/components/input'
import { useState, type ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

type AuthFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder: string
  /** 左侧装饰图标（lucide） */
  icon: ReactNode
  /** 传 password 时渲染为可切换明文的密码框 */
  type?: 'text' | 'password'
  maxLength?: number
  inputMode?: 'text' | 'numeric'
  autoComplete?: string
}

/** 登录相关表单的受控字段：图标 + 标签 + 校验信息 */
function AuthField<T extends FieldValues>(props: AuthFieldProps<T>) {
  const {
    control,
    name,
    label,
    placeholder,
    icon,
    type = 'text',
    maxLength,
    inputMode,
    autoComplete
  } = props
  const [isRevealed, setIsRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <FormField
      control={control}
      name={name}
      render={function ({ field }) {
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                {icon}
              </span>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  className="h-11 pl-9"
                  type={isPassword && !isRevealed ? 'password' : 'text'}
                  maxLength={maxLength}
                  inputMode={inputMode}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  aria-label={label}
                />
              </FormControl>
              {isPassword && (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={isRevealed ? '隐藏密码' : '显示密码'}
                  onClick={function () {
                    setIsRevealed(function (prev) {
                      return !prev
                    })
                  }}>
                  <Icon
                    icon={isRevealed ? 'lucide:eye-off' : 'lucide:eye'}
                    className="size-4"
                  />
                </button>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export { AuthField }
