import { Icon } from '@iconify/react/offline'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@i-thinking/design/components/button'
import { Form } from '@i-thinking/design/components/form'
import { ToggleGroup, ToggleGroupItem } from '@i-thinking/design/components/toggle-group'
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

/** 预填空串：zod 的 required 文案只在值是字符串时才生效 */
const FORGOT_DEFAULTS: ForgotValues = {
  username: '',
  phone: '',
  email: '',
  captcha: '',
  password: '',
  confirm: ''
}

function ForgotForm(props: ForgotFormProps) {
  const { motionKey, forgotMode, onModeChange, onSignin } = props
  const form = useForm<ForgotValues>({
    resolver: zodResolver(FORGOT_SCHEMA[forgotMode]) as Resolver<ForgotValues>,
    defaultValues: FORGOT_DEFAULTS
  })

  useEffect(
    function () {
      form.reset(FORGOT_DEFAULTS)
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
            <ToggleGroup
              className="grid w-full grid-cols-3"
              value={[forgotMode]}
              onValueChange={function (value) {
                const next = value[0] as AuthMode | undefined
                if (next) onModeChange(next)
              }}>
              {MODE.options.map(function (option) {
                return (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="data-[pressed]:bg-primary/10 data-[pressed]:text-primary">
                    {option.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </MotionField>

          {forgotMode === MODE.USERNAME && (
            <MotionField>
              <AuthField
                control={form.control}
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                icon={<Icon icon="lucide:user" />}
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
                icon={<Icon icon="lucide:smartphone" />}
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
                icon={<Icon icon="lucide:mail" />}
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
              icon={<Icon icon="lucide:lock" />}
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
              icon={<Icon icon="lucide:lock" />}
              maxLength={LIMIT.PASSWORD}
              autoComplete="new-password"
            />
          </MotionField>

          <MotionField className={styles.actions}>
            <Button
              type="submit"
              className="h-11 w-full">
              确认重置
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
