import { AuthToken_Key } from '@/decorator/auth-token.decorator'
import { type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JWTAuthGuard extends AuthGuard('jwt') {
	constructor(private reflector: Reflector) {
		super()
	}

	canActivate(ctx: ExecutionContext) {
		const isAuthToken = this.reflector.getAllAndOverride<boolean>(AuthToken_Key, [
			ctx.getHandler(),
			ctx.getClass()
		])

		if (isAuthToken) return true
		return super.canActivate(ctx)
	}
}
