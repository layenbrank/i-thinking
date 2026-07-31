import { Button, Form, Input, message } from 'antd'
import { Icon } from '@iconify/react/offline'
import { useState } from 'react'

import { POST_SIGNUP } from '@/apis/auth.ts'
import { LIMIT, RULE } from '@/features/signin/constants.ts'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'

type SignupFormValues = {
  username: string
  password: string
  confirm: string
}

type SignupFormProps = {
  motionKey: number
  onSignin: () => void
}

function SignupForm(props: SignupFormProps) {
  const { motionKey, onSignin } = props
  const [form] = Form.useForm<SignupFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onFinish(values: SignupFormValues) {
    setIsSubmitting(true)

    try {
      await POST_SIGNUP({
        username: values.username,
        password: values.password
      })
      message.success('注册成功（mock）')
      form.resetFields()
      onSignin()
    } catch {
      message.error('注册失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form
      form={form}
      name="signup"
      layout="vertical"
      requiredMark={false}
      className={styles.form}
      onFinish={onFinish}>
      <FormStagger key={motionKey}>
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

        <MotionField>
          <Form.Item
            name="confirm"
            label="确认密码"
            dependencies={['password']}
            rules={[{ required: true, message: '请确认密码！' }, RULE.confirm(form)]}>
            <Input.Password
              size="large"
              maxLength={LIMIT.PASSWORD}
              prefix={<Icon icon="ant-design:lock-outlined" />}
              aria-label="确认密码"
              placeholder="请再次输入密码"
            />
          </Form.Item>
        </MotionField>

        <MotionField className={styles.actions}>
          <Button
            block
            size="large"
            type="primary"
            htmlType="submit"
            loading={isSubmitting}>
            确认注册
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

export { SignupForm }
