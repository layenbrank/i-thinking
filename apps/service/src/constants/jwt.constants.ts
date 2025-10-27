import type { JwtSignOptions } from '@nestjs/jwt'

export const jwtConstants: Readonly<JwtSignOptions> = {
	secret: 'secret-key', // 密钥
	expiresIn: '1h' // token有效时间
}
