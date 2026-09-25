import { HttpEnvelope } from '@/utils/http.errors.ts'
import { http } from '@/utils/http.ts'

interface SlideProof {
  captchaKey: string
  captchaValue: string
  captchaKind?: string
}

interface AuthSession {
  token: string
  id: string
  username: string
  role: string
  status: string
  createdAt: number
  updatedAt: number
}

interface AuthAvatar {
  id: string
  url: string
  name: string
}

/** 与 service 的 `ProfileR` 同名同形（`GET /auth/profile`） */
interface AuthProfile {
  id: string
  username: string
  role: string
  status: string
  email: string | null
  phone: string | null
  gender: string | null
  birthday: string | null
  age: number | null
  avatar: AuthAvatar | null
  createdAt: number
  updatedAt: number
}

interface CaptchaChallenge {
  kind: string
  captchaKey: string
  masterImage: string
  thumbImage: string
  thumbX: number
  thumbY: number
  thumbWidth: number
  thumbHeight: number
}

type OtpChannel = 'PHONE' | 'EMAIL'

interface OtpParams extends SlideProof {
  channel: OtpChannel
  target: string
}

interface PasswordIdentity {
  username?: string
  channel?: OtpChannel
  target?: string
}

interface ForgotParams extends PasswordIdentity, SlideProof {}

interface ResetParams extends PasswordIdentity {
  code: string
  newPassword: string
}

async function unwrap<T>(pending: Promise<RSF<T>>): Promise<T> {
  return HttpEnvelope(await pending)
}

function POST_CAPTCHA() {
  return unwrap(http.post<RSF<CaptchaChallenge>>('/auth/captcha', {}))
}

function POST_OTP(data: OtpParams) {
  return unwrap(http.post<RSF<null>>('/auth/otp', data))
}

function POST_SIGNIN(data: { username: string; password: string } & SlideProof) {
  return unwrap(http.post<RSF<AuthSession>>('/auth/signin', data))
}

function POST_SIGNIN_PHONE(data: { phone: string; code: string }) {
  return unwrap(http.post<RSF<AuthSession>>('/auth/signin/phone', data))
}

function POST_SIGNIN_EMAIL(data: { email: string; code: string }) {
  return unwrap(http.post<RSF<AuthSession>>('/auth/signin/email', data))
}

function POST_SIGNUP(data: { username: string; password: string } & SlideProof) {
  return unwrap(http.post<RSF<AuthSession>>('/auth/signup', data))
}

function POST_PASSWORD_FORGOT(data: ForgotParams) {
  return unwrap(http.post<RSF<null>>('/auth/password/forgot', data))
}

function POST_PASSWORD_RESET(data: ResetParams) {
  return unwrap(http.post<RSF<null>>('/auth/password/reset', data))
}

/** 当前登录账号的资料；令牌失效时服务端回 300001/300002/300003（见 `isSessionInvalid`） */
function GET_AUTH_PROFILE() {
  return unwrap(http.get<RSF<AuthProfile>>('/auth/profile'))
}

/** 登出：服务端把这份令牌记进黑名单，之后它连资料都读不到 */
function POST_AUTH_SIGNOUT() {
  return unwrap(http.post<RSF<null>>('/auth/signout'))
}

export {
  GET_AUTH_PROFILE,
  POST_AUTH_SIGNOUT,
  POST_CAPTCHA,
  POST_OTP,
  POST_PASSWORD_FORGOT,
  POST_PASSWORD_RESET,
  POST_SIGNIN,
  POST_SIGNIN_EMAIL,
  POST_SIGNIN_PHONE,
  POST_SIGNUP
}

export type { AuthAvatar, AuthProfile, AuthSession, CaptchaChallenge, OtpChannel, SlideProof }
