import { Button, Checkbox, Form, Input, Segmented, message } from 'antd'
import { Icon } from '@iconify/react'
import { useEffect } from 'react'

import {
  LIMIT,
  MODE,
  RULE,
  type AuthMode
} from '@/features/signin/constants.ts'
import { CaptchaField } from '@/features/signin/captcha-field.tsx'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'

type SigninFormValues = {
  username?: string
  phone?: string
  email?: string
  password?: string
  captcha?: string
  remember?: boolean
}

type SigninFormProps = {
  motionKey: number
  signinMode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onForgot: () => void
  onSignup: () => void
}

function SigninForm(props: SigninFormProps) {
  const { motionKey, signinMode, onModeChange, onForgot, onSignup } = props
  const [form] = Form.useForm<SigninFormValues>()

  useEffect(
    function () {
      form.resetFields()
      form.setFieldValue('remember', true)
    },
    [form, signinMode]
  )

  function onFinish(_values: SigninFormValues) {
    message.success('登录成功（mock）')
  }

  function onSegmentChange(value: string | number) {
    onModeChange(value as AuthMode)
  }

  const isPasswordMode = signinMode === MODE.USERNAME || signinMode === MODE.EMAIL

  return (
    <Form
      form={form}
      name="signin"
      layout="vertical"
      requiredMark={false}
      initialValues={{ remember: true }}
      className={styles.form}
      onFinish={onFinish}>
      <FormStagger key={`${motionKey}-${signinMode}`}>
        <MotionField className={styles.tabs}>
          <Segmented
            block
            value={signinMode}
            options={MODE.options}
            onChange={onSegmentChange}
          />
        </MotionField>

        {signinMode === MODE.USERNAME && (
          <>
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
            <MotionField>
              <Form.Item
                name="password"
                label="密码"
                rules={RULE.PASSWORD}>
                <Input.Password
                  size="large"
                  maxLength={LIMIT.PASSWORD}
                  prefix={<Icon icon="ant-design:lock-outlined" />}
                  placeholder="请输入密码"
                  aria-label="密码"
                />
              </Form.Item>
            </MotionField>
          </>
        )}

        {signinMode === MODE.PHONE && (
          <>
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
            <MotionField>
              <CaptchaField
                form={form}
                mode={MODE.PHONE}
                targetField="phone"
              />
            </MotionField>
          </>
        )}

        {signinMode === MODE.EMAIL && (
          <>
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
            <MotionField>
              <Form.Item
                name="password"
                label="密码"
                rules={RULE.PASSWORD}>
                <Input.Password
                  size="large"
                  maxLength={LIMIT.PASSWORD}
                  prefix={<Icon icon="ant-design:lock-outlined" />}
                  placeholder="请输入密码"
                  aria-label="密码"
                />
              </Form.Item>
            </MotionField>
          </>
        )}

        <MotionField className={styles.extra}>
          {isPasswordMode ? (
            <Form.Item
              noStyle
              name="remember"
              valuePropName="checked">
              <Checkbox>记住我</Checkbox>
            </Form.Item>
          ) : (
            <span />
          )}
          <Button
            type="link"
            htmlType="button"
            onClick={onForgot}>
            忘记密码
          </Button>
        </MotionField>

        <MotionField className={styles.actions}>
          <Button
            block
            size="large"
            type="primary"
            htmlType="submit">
            登录
          </Button>
          <Button
            block
            size="large"
            htmlType="button"
            onClick={onSignup}>
            注册
          </Button>
        </MotionField>
      </FormStagger>
    </Form>
  )
}

export { SigninForm }
