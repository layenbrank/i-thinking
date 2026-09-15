import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@i-thinking/design/components/button'
import { Form } from '@i-thinking/design/components/form'
import { Tabs, TabsList, TabsTrigger } from '@i-thinking/design/components/tabs'
import { LockIcon, MailIcon, SmartphoneIcon, UserIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { POST_RESET_PASSWORD } from '@/apis/auth.ts'
import {
  FORGOT_SCHEMA,
  LIMIT,
  MODE,
  findIdentity,
  type AuthMode,
  type ForgotValues
} from '@/features/signin/constants.ts'
import { CaptchaField } from '@/features/signin/captcha-field.tsx'
import { AuthField } from '@/features/signin/field.tsx'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'

type ForgotFormProps = {
  motionKey: number
  forgotMode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSignin: () => void
}

function ForgotForm(props: ForgotFormProps) {
  const { motionKey, forgotMode, onModeChange, onSignin } = props

  const form = useForm<ForgotValues>({
    resolver: zodResolver(FORGOT_SCHEMA[forgotMode]) as Resolver<ForgotValues>
  })

  useEffect(
    function () {
      form.reset()
    },
    [form, forgotMode]
  )

  async function onSubmit(values: ForgotValues) {
    const target = findIdentity(forgotMode, values)

    try {
      await POST_RESET_PASSWORD({
        mode: forgotMode,
        target,
        captcha: values.captcha ?? '',
        password: values.password ?? ''
      })
      toast.success('密码重置成功（mock）')
      onSignin()
    } catch {
      toast.error('密码重置失败，请稍后重试')
    }
  }

  return (
    <Form {...form}>
      <form
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormStagger key={`${motionKey}-${forgotMode}`}>
          <MotionField className={styles.tabs}>
            <Tabs
              value={forgotMode}
              onValueChange={function (value) {
                onModeChange(value as AuthMode)
              }}>
              <TabsList className="grid w-full grid-cols-3">
                {MODE.options.map(function (option) {
                  return (
                    <TabsTrigger
                      key={option.value}
                      value={option.value}>
                      {option.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </MotionField>

          {forgotMode === MODE.USERNAME && (
            <MotionField>
              <AuthField
                control={form.control}
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                icon={<UserIcon />}
                maxLength={LIMIT.USERNAME}
                autoComplete="username"
              />
            </MotionField>
          )}

          {forgotMode === MODE.PHONE && (
            <MotionField>
              <AuthField
                control={form.control}
                name="phone"
                label="手机号"
                placeholder="请输入手机号"
                icon={<SmartphoneIcon />}
                inputMode="numeric"
                maxLength={LIMIT.PHONE}
                autoComplete="tel"
              />
            </MotionField>
          )}

          {forgotMode === MODE.EMAIL && (
            <MotionField>
              <AuthField
                control={form.control}
                name="email"
                label="邮箱"
                placeholder="请输入邮箱"
                icon={<MailIcon />}
                maxLength={LIMIT.EMAIL}
                autoComplete="email"
              />
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
            <AuthField
              control={form.control}
              name="password"
              type="password"
              label="新密码"
              placeholder="请输入新密码"
              icon={<LockIcon />}
              maxLength={LIMIT.PASSWORD}
              autoComplete="new-password"
            />
          </MotionField>

          <MotionField>
            <AuthField
              control={form.control}
              name="confirm"
              type="password"
              label="确认密码"
              placeholder="请再次输入新密码"
              icon={<LockIcon />}
              maxLength={LIMIT.PASSWORD}
              autoComplete="new-password"
            />
          </MotionField>

          <MotionField className={styles.actions}>
            <Button
              type="submit"
              className="h-11 w-full"
              aria-busy={form.formState.isSubmitting}>
              重置密码
            </Button>
          </MotionField>

          <MotionField className={styles.back}>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={onSignin}>
              返回登录
            </Button>
          </MotionField>
        </FormStagger>
      </form>
    </Form>
  )
}

export { ForgotForm }
