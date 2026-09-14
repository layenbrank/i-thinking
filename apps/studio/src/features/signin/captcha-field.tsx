import { Button } from '@i-thinking/ui/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@i-thinking/ui/components/ui/form'
import { Input } from '@i-thinking/ui/components/ui/input'
import { ShieldCheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

import { POST_SEND_CAPTCHA } from '@/apis/auth.ts'
import { CAPTCHA_COUNTDOWN, LIMIT, type AuthMode } from '@/features/signin/constants.ts'
import styles from '@/features/signin/signin.module.scss'

/** 表单里验证码字段的固定名（泛型 T 由各表单给出，故此处收窄一次） */
const CAPTCHA_NAME = 'captcha'

interface CaptchaFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>
  mode: AuthMode
  /** 发送前需要先通过校验的身份字段（username / phone / email） */
  targetField: FieldPath<T>
}

function CaptchaField<T extends FieldValues>(props: CaptchaFieldProps<T>) {
  const { form, mode, targetField } = props
  const [countdown, updateCountdown] = useState(0)
  const [isSending, updateSending] = useState(false)

  useEffect(
    function () {
      if (countdown <= 0) return

      const timer = window.setTimeout(function () {
        updateCountdown(function (prev) {
          return prev - 1
        })
      }, 1000)

      return function () {
        window.clearTimeout(timer)
      }
    },
    [countdown]
  )

  async function onSendCaptcha() {
    const isValid = await form.trigger(targetField)
    if (!isValid) return

    const target = String(form.getValues(targetField) ?? '')
    updateSending(true)

    try {
      await POST_SEND_CAPTCHA({ mode, target })
      toast.success('验证码已发送（mock: 123456）')
      updateCountdown(CAPTCHA_COUNTDOWN)
    } catch {
      toast.error('验证码发送失败，请稍后重试')
    } finally {
      updateSending(false)
    }
  }

  const label = isSending ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'

  return (
    <FormField
      control={form.control}
      name={CAPTCHA_NAME as FieldPath<T>}
      render={function ({ field }) {
        return (
          <FormItem>
            <FormLabel>验证码</FormLabel>
            <div className={styles.captcha}>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                  <ShieldCheckIcon />
                </span>
                <FormControl>
                  <Input
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    className="h-11 pl-9"
                    maxLength={LIMIT.CAPTCHA}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="请输入验证码"
                    aria-label="验证码"
                  />
                </FormControl>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                disabled={countdown > 0 || isSending}
                onClick={function () {
                  void onSendCaptcha()
                }}>
                {label}
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export { CaptchaField }
