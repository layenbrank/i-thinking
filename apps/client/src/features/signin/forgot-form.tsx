import { Button, Form, Input, Segmented, message } from 'antd'
import { Icon } from '@iconify/react/offline'
import { useEffect } from 'react'

import { POST_RESET_PASSWORD } from '@/apis/auth.ts'
import {
  LIMIT,
  MODE,
  RULE,
  findIdentity,
  type AuthMode
} from '@/features/signin/constants.ts'
import { CaptchaField } from '@/features/signin/captcha-field.tsx'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'

type ForgotFormValues = {
  username?: string
  phone?: string
  email?: string
  captcha?: string
  password?: string
  confirm?: string
}

type ForgotFormProps = {
  motionKey: number
  forgotMode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSignin: () => void
}

function ForgotForm(props: ForgotFormProps) {
  const { motionKey, forgotMode, onModeChange, onSignin } = props
  const [form] = Form.useForm<ForgotFormValues>()

  useEffect(
    function () {
      form.resetFields()
    },
    [form, forgotMode]
  )

  async function onFinish(values: ForgotFormValues) {
    const target = findIdentity(forgotMode, values)

    try {
      await POST_RESET_PASSWORD({
        mode: forgotMode,
        target,
        captcha: values.captcha ?? '',
        password: values.password ?? ''
      })
      message.success('密码重置成功（mock）')
      onSignin()
    } catch {
      message.error('密码重置失败，请稍后重试')
    }
  }

  function onSegmentChange(value: string | number) {
    onModeChange(value as AuthMode)
  }

  return (
    <Form
      form={form}
      name="forgot"
      layout="vertical"
      requiredMark={false}
      className={styles.form}
      onFinish={onFinish}>
      <FormStagger key={`${motionKey}-${forgotMode}`}>
          <MotionField className={styles.tabs}>
            <Segmented
              block
              value={forgotMode}
              options={MODE.options}
              onChange={onSegmentChange}
            />
          </MotionField>

          {forgotMode === MODE.USERNAME && (
            <MotionField>
              <Form.Item
                name="username"
                label="用户名"
                rules={RULE.USERNAME}>
                <Input
                  size="large"
                  maxLength={LIMIT.USERNAME}
                  prefix={<Icon icon="ant-design:user-outlined" />}
                  placeholder="请输入用户名"
                  aria-label="用户名"
                />
              </Form.Item>
            </MotionField>
          )}

          {forgotMode === MODE.PHONE && (
            <MotionField>
              <Form.Item
                name="phone"
                label="手机号"
                rules={RULE.PHONE}>
                <Input
                  size="large"
                  maxLength={LIMIT.PHONE}
                  inputMode="numeric"
                  prefix={<Icon icon="ant-design:mobile-outlined" />}
                  placeholder="请输入手机号"
                  aria-label="手机号"
                />
              </Form.Item>
            </MotionField>
          )}

          {forgotMode === MODE.EMAIL && (
            <MotionField>
              <Form.Item
                name="email"
                label="邮箱"
                rules={RULE.EMAIL}>
                <Input
                  size="large"
                  maxLength={LIMIT.EMAIL}
                  prefix={<Icon icon="ant-design:mail-outlined" />}
                  placeholder="请输入邮箱"
                  aria-label="邮箱"
                />
              </Form.Item>
            </MotionField>
          )}

          <MotionField>
            <CaptchaField
              form={form}
              mode={forgotMode}
              targetField={forgotMode}
            />
          </MotionField>

          <MotionField>
            <Form.Item
              name="password"
              label="新密码"
              rules={RULE.PASSWORD}>
              <Input.Password
                size="large"
                maxLength={LIMIT.PASSWORD}
                prefix={<Icon icon="ant-design:lock-outlined" />}
                placeholder="请输入新密码"
                aria-label="新密码"
              />
            </Form.Item>
          </MotionField>

          <MotionField>
            <Form.Item
              name="confirm"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码！' },
                RULE.confirm(form)
              ]}>
              <Input.Password
                size="large"
                maxLength={LIMIT.PASSWORD}
                prefix={<Icon icon="ant-design:lock-outlined" />}
                placeholder="请再次输入新密码"
                aria-label="确认密码"
              />
            </Form.Item>
          </MotionField>

          <MotionField className={styles.actions}>
            <Button
              block
              size="large"
              type="primary"
              htmlType="submit">
              确认重置
            </Button>
          </MotionField>

          <MotionField className={styles.back}>
            <Button
              type="link"
              htmlType="button"
              onClick={onSignin}>
              返回登录
            </Button>
          </MotionField>
        </FormStagger>
    </Form>
  )
}

export { ForgotForm }
