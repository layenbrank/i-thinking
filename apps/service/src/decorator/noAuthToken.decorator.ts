import { SetMetadata } from '@nestjs/common'

export const NO_AuthToken_Key = 'noAuthToken'
export const NoAuthToken = () => SetMetadata(NO_AuthToken_Key, true)
