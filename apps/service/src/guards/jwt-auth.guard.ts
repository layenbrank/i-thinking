import { NO_AuthToken_Key } from '@/decorator/noAuthToken.decorator'
import { type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

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
