import { SetMetadata } from '@nestjs/common'

export const AuthToken_Key = 'AuthToken'
export const AuthToken = () => SetMetadata(AuthToken_Key, true)
