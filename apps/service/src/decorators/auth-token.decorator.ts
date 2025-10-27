import { SetMetadata } from '@nestjs/common'

export const AuthTokenKey = 'AuthToken'
export const AuthToken = () => SetMetadata(AuthTokenKey, true)
