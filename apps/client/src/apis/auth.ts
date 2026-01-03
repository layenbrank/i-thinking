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
}

function POST_SIGNIN(data: Auth.SignIn.Params) {
  return http.post<RSF<Auth.SignIn.Response>>('/auth/signin', data, {
    context: THINKING_TOKEN
  })
}

export { POST_SIGNIN }
