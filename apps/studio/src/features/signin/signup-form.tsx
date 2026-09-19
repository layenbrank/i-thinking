import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@i-thinking/design/components/button'
import { Form } from '@i-thinking/design/components/form'
import { LockIcon, UserIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { POST_SIGNUP } from '@/apis/auth.ts'
import { LIMIT, SIGNUP_SCHEMA, type SignupValues } from '@/features/signin/constants.ts'
import { AuthField } from '@/features/signin/field.tsx'
import { FormStagger, MotionField } from '@/features/signin/form-motion.tsx'
import styles from '@/features/signin/signin.module.scss'
import { useSlideProof } from '@/features/signin/slide.tsx'
import { HttpError } from '@/utils/http.errors.ts'
import { writeAuthToken } from '@/utils/auth.ts'

type SignupFormProps = {
  motionKey: number
  onSignin: () => void
  onSuccess: () => void
}

function SignupForm(props: SignupFormProps) {
  const { motionKey, onSignin, onSuccess } = props
  const { askSlide, dialog } = useSlideProof()

  const form = useForm<SignupValues>({
    resolver: zodResolver(SIGNUP_SCHEMA),
    defaultValues: { username: '', password: '', confirm: '' }
  })

  async function onSubmit(values: SignupValues) {
    try {
      const proof = await askSlide()
      if (!proof) return
      const session = await POST_SIGNUP({
        username: values.username,
        password: values.password,
        ...proof
      })
      writeAuthToken(session.token, true)
      toast.success('注册成功')
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error(HttpError(error).message || '注册失败，请稍后重试')
    }
  }

  return (
    <Form {...form}>
      <form
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormStagger key={motionKey}>
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
              autoComplete="new-password"
            />
          </MotionField>

          <MotionField>
            <AuthField
              control={form.control}
              name="confirm"
              type="password"
              label="确认密码"
              placeholder="请再次输入密码"
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
              确认注册
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
        {dialog}
      </form>
    </Form>
  )
}

export { SignupForm }
