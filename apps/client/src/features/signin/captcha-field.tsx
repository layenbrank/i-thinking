import { Button, Form, Input, message } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'

import { POST_SEND_CAPTCHA } from '@/apis/auth.ts'
import {
  CAPTCHA_COUNTDOWN,
  LIMIT,
  RULE,
  type AuthMode
} from '@/features/signin/constants.ts'
import styles from '@/features/signin/signin.module.scss'

type CaptchaFieldProps = {
  form: FormInstance
  mode: AuthMode
  targetField: string
}

function CaptchaField(props: CaptchaFieldProps) {
  const { form, mode, targetField } = props
  const [countdown, setCountdown] = useState(0)
  const [isSending, setIsSending] = useState(false)

  useEffect(
    function () {
      if (countdown <= 0) return

      const timer = window.setTimeout(function () {
        setCountdown(function (prev) {
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
    try {
      await form.validateFields([targetField])
    } catch {
      return
    }

    const target = form.getFieldValue(targetField) as string
    setIsSending(true)

    try {
      await POST_SEND_CAPTCHA({ mode, target })
      message.success('验证码已发送（mock: 123456）')
      setCountdown(CAPTCHA_COUNTDOWN)
    } catch {
      message.error('验证码发送失败，请稍后重试')
    } finally {
      setIsSending(false)
    }
  }

  function renderButtonLabel() {
    if (countdown > 0) {
      return `${countdown}s 后重发`
    }
    return '获取验证码'
  }

  return (
    <Form.Item
      name="captcha"
      label="验证码"
      rules={RULE.CAPTCHA}>
      <div className={styles.captcha}>
        <Input
          size="large"
          maxLength={LIMIT.CAPTCHA}
          inputMode="numeric"
          prefix={<Icon icon="ant-design:safety-outlined" />}
          placeholder="请输入验证码"
          aria-label="验证码"
        />
        <Button
          size="large"
          loading={isSending}
          disabled={countdown > 0}
          onClick={onSendCaptcha}>
          {renderButtonLabel()}
        </Button>
      </div>
    </Form.Item>
  )
}

export { CaptchaField }
