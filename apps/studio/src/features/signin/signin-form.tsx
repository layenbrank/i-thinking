import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@i-thinking/ui/button'
import { Checkbox } from '@i-thinking/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@i-thinking/ui/form'
import { Tabs, TabsList, TabsTrigger } from '@i-thinking/ui/tabs'
import { LockIcon, MailIcon, SmartphoneIcon, UserIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { LIMIT, MODE, SIGNIN_SCHEMA, type AuthMode, type SigninValues } from '@/features/signin/constants.ts'
import { CaptchaField } from '@/features/signin/captcha-field.tsx'
import { AuthField } from '@/features/signin/field.tsx'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'

type SigninFormProps = {
  motionKey: number
  signinMode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onForgot: () => void
  onSignup: () => void
}

function SigninForm(props: SigninFormProps) {
  const { motionKey, signinMode, onModeChange, onForgot, onSignup } = props

  // 每个身份对应一套 schema；收窄一次泛型以满足 RHF 的联合类型
  const form = useForm<SigninValues>({
    resolver: zodResolver(SIGNIN_SCHEMA[signinMode]) as Resolver<SigninValues>,
    defaultValues: { remember: true }
  })

  useEffect(
    function () {
      form.reset({ remember: true })
    },
    [form, signinMode]
  )

  function onSubmit(_values: SigninValues) {
    toast.success('登录成功（mock）')
  }

  const isPasswordMode = signinMode === MODE.USERNAME || signinMode === MODE.EMAIL

  return (
    <Form {...form}>
      <form
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormStagger key={`${motionKey}-${signinMode}`}>
          <MotionField className={styles.tabs}>
            <Tabs
              value={signinMode}
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

          {signinMode === MODE.USERNAME && (
            <>
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
              <MotionField>
                <AuthField
                  control={form.control}
                  name="password"
                  type="password"
                  label="密码"
                  placeholder="请输入密码"
                  icon={<LockIcon />}
                  maxLength={LIMIT.PASSWORD}
                  autoComplete="current-password"
                />
              </MotionField>
            </>
          )}

          {signinMode === MODE.PHONE && (
            <>
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
              <MotionField>
                <AuthField
                  control={form.control}
                  name="password"
                  type="password"
                  label="密码"
                  placeholder="请输入密码"
                  icon={<LockIcon />}
                  maxLength={LIMIT.PASSWORD}
                  autoComplete="current-password"
                />
              </MotionField>
            </>
          )}

          <MotionField className={styles.extra}>
            {isPasswordMode ? (
              <FormField
                control={form.control}
                name="remember"
                render={function ({ field }) {
                  return (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">记住我</FormLabel>
                    </FormItem>
                  )
                }}
              />
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={onForgot}>
              忘记密码
            </Button>
          </MotionField>

          <MotionField className={styles.actions}>
            <Button
              type="submit"
              className="h-11 w-full"
              aria-busy={form.formState.isSubmitting}>
              登录
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={onSignup}>
              注册
            </Button>
          </MotionField>
        </FormStagger>
      </form>
    </Form>
  )
}

export { SigninForm }
