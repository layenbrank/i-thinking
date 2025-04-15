import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { NO_AuthToken_Key } from '@/decorator/noAuthToken.decorator'
import type { Request } from 'express'

@Injectable()
export class JWTAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isNoAuthToken = this.reflector.getAllAndOverride<boolean>(NO_AuthToken_Key, [
      context.getHandler(),
      context.getClass()
    ])
    if (isNoAuthToken) {
      return true
    }
    return super.canActivate(context)
  }
}
