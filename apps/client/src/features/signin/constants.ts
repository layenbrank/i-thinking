import type { FormInstance, Rule, RuleObject } from 'antd/es/form'

type HeadText = {
  title: string
  subtitle: string
}

type IdentityValues = {
  username?: string
  phone?: string
  email?: string
}

type SlideMotionOptions = {
  isReducedMotion: boolean
  offset?: number
  axis?: 'x' | 'y'
}

const PANEL = {
  SIGNIN: 'signin',
  FORGOT: 'forgot',
  SIGNUP: 'signup'
} as const

const PATTERN = {
  PHONE: /^1\d{10}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const

type PanelView = (typeof PANEL)[keyof typeof PANEL]
type AuthMode = 'username' | 'phone' | 'email'

type ModeOption = {
  label: string
  value: AuthMode
}

const MODE = {
  USERNAME: 'username' as AuthMode,
  PHONE: 'phone' as AuthMode,
  EMAIL: 'email' as AuthMode,
  options: [
    { label: '用户名', value: 'username' },
    { label: '手机号', value: 'phone' },
    { label: '邮箱', value: 'email' }
  ] as ModeOption[]
}

const CAPTCHA_COUNTDOWN = 60

const LIMIT = {
  USERNAME: 12,
  PHONE: 11,
  EMAIL: 64,
  PASSWORD: 20,
  CAPTCHA: 6
} as const

const HEAD = {
  [PANEL.SIGNIN]: {
    title: '欢迎回来',
    subtitle: '登录您的账号以继续'
  },
  [PANEL.FORGOT]: {
    title: '找回密码',
    subtitle: '验证身份后设置新密码'
  },
  [PANEL.SIGNUP]: {
    title: '创建账号',
    subtitle: '注册后即可使用 i-thinking'
  }
} satisfies Record<PanelView, HeadText>

const RULE = {
  USERNAME: [
    { required: true, message: '请输入用户名！' },
    { min: 2, max: 12, message: '用户名长度为 2–12 个字符' }
  ],
  PHONE: [
    { required: true, message: '请输入手机号！' },
    { pattern: PATTERN.PHONE, message: '手机号格式错误！' }
  ],
  EMAIL: [
    { required: true, message: '请输入邮箱！' },
    { pattern: PATTERN.EMAIL, message: '邮箱格式错误！' }
  ],
  PASSWORD: [
    { required: true, message: '请输入密码！' },
    { min: 4, max: 20, message: '密码长度为 4–20 个字符' }
  ],
  CAPTCHA: [
    { required: true, message: '请输入验证码！' },
    { len: LIMIT.CAPTCHA, message: '验证码为 6 位数字' },
    { pattern: /^\d{6}$/, message: '验证码格式错误！' }
  ],
  confirm(form: Pick<FormInstance, 'getFieldValue'>): RuleObject {
    return {
      validator(_rule: unknown, value: string, _callback?: (error?: string) => void) {
        if (!value || form.getFieldValue('password') === value) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('两次输入的密码不一致！'))
      }
    }
  }
}

const MOTION = {
  DURATION: 0.22,
  EASE: [0.22, 1, 0.36, 1] as const,
  STAGGER: 0.07,
  DELAY_CHILDREN: 0.04,
  OFFSET: {
    HEAD: 4,
    VIEW: 8,
    X: 28
  },
  transition(isReducedMotion: boolean) {
    return {
      duration: isReducedMotion ? 0 : MOTION.DURATION,
      ease: MOTION.EASE
    }
  },
  variants(options: SlideMotionOptions) {
    const { isReducedMotion, offset = MOTION.OFFSET.VIEW, axis = 'y' } = options
    const slide = axis === 'x' ? 'x' : 'y'
    return {
      initial: {
        opacity: isReducedMotion ? 1 : 0,
        [slide]: isReducedMotion ? 0 : offset
      },
      animate: { opacity: 1, [slide]: 0 },
      exit: {
        opacity: isReducedMotion ? 1 : 0,
        [slide]: isReducedMotion ? 0 : axis === 'x' ? -offset * 0.5 : -offset
      }
    }
  },
  fadeVariants(isReducedMotion: boolean) {
    return {
      initial: { opacity: isReducedMotion ? 1 : 0 },
      animate: { opacity: 1 },
      exit: { opacity: isReducedMotion ? 1 : 0 }
    }
  },
  containerVariants(isReducedMotion: boolean) {
    return {
      initial: {},
      animate: {
        transition: {
          staggerChildren: isReducedMotion ? 0 : MOTION.STAGGER,
          delayChildren: isReducedMotion ? 0 : MOTION.DELAY_CHILDREN
        }
      },
      exit: {
        transition: {
          staggerChildren: isReducedMotion ? 0 : MOTION.STAGGER * 0.5,
          staggerDirection: -1
        }
      }
    }
  },
  itemVariants(options: SlideMotionOptions) {
    const { isReducedMotion, offset = MOTION.OFFSET.X, axis = 'x' } = options
    const slide = axis === 'x' ? 'x' : 'y'
    return {
      initial: {
        opacity: isReducedMotion ? 1 : 0,
        [slide]: isReducedMotion ? 0 : offset
      },
      animate: { opacity: 1, [slide]: 0 },
      exit: {
        opacity: isReducedMotion ? 1 : 0,
        [slide]: isReducedMotion ? 0 : axis === 'x' ? -offset * 0.5 : -offset
      }
    }
  }
}

function findIdentity(mode: AuthMode, values: IdentityValues) {
  if (mode === MODE.USERNAME) return values.username ?? ''
  if (mode === MODE.PHONE) return values.phone ?? ''
  return values.email ?? ''
}

export {
  CAPTCHA_COUNTDOWN,
  HEAD,
  LIMIT,
  MODE,
  MOTION,
  PANEL,
  PATTERN,
  RULE,
  findIdentity
}

export type { AuthMode, HeadText, PanelView }
