// 验证策略，也就是验证前端请求头中携带的token
import { jwtConstants } from '@/constants/jwt.constants'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JWTPayload {
  username: string
  id: string
}

export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret ?? ''
    })
  }

  public validate(payload: JWTPayload) {
    // 获取jwt中的用户信息并返回

    return {
      username: payload.username,
      id: payload.id
    }
  }
}
