import { http } from '@/utils/http/http.ts'
import { THINKING_TOKEN } from '@/utils/http/token.ts'

declare namespace Auth {
  namespace SignIn {
    export interface Params {
      username: string
      password: string
    }

    export interface Response {
      token: string
      id: string
      username: string
      createdAt: number
      updatedAt: number
    }
  }

  namespace SendCaptcha {
    export interface Params {
      mode: 'username' | 'phone' | 'email'
      target: string
    }
  }

  namespace ResetPassword {
    export interface Params {
      mode: 'username' | 'phone' | 'email'
      target: string
      captcha: string
      password: string
    }
  }

  namespace SignUp {
    export interface Params {
      username: string
      password: string
    }

    export interface Response {
      id: string
      username: string
      createdAt: number
      updatedAt: number
    }
  }
}

function POST_SIGNIN(data: Auth.SignIn.Params) {
  return http.post<RSF<Auth.SignIn.Response>>('/auth/signin', data, {
    context: THINKING_TOKEN
  })
}

// mock：验证码发送，后续接入真实接口
function POST_SEND_CAPTCHA(_data: Auth.SendCaptcha.Params) {
  return Promise.resolve()
}

// mock：密码重置，后续接入真实接口
function POST_RESET_PASSWORD(_data: Auth.ResetPassword.Params) {
  return Promise.resolve()
}

// mock：用户注册，后续接入真实接口
function POST_SIGNUP(_data: Auth.SignUp.Params) {
  const now = Date.now()
  return Promise.resolve<Auth.SignUp.Response>({
    id: 'mock-id',
    username: _data.username,
    createdAt: now,
    updatedAt: now
  })
}

export { POST_RESET_PASSWORD, POST_SEND_CAPTCHA, POST_SIGNIN, POST_SIGNUP }
