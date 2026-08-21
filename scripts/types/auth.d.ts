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

  namespace SignUp {
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
