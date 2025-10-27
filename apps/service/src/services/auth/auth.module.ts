import { jwtConstants } from '@/constants/jwt.constants'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthStrategy } from './jwt-auth.strategy'
import { User, UserSchema } from './schemas/auth.schema'

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: User.name,
				schema: UserSchema
			}
		]),
		JwtModule.register({
			secret: jwtConstants.secret,
			signOptions: {
				expiresIn: jwtConstants.expiresIn
			},
			verifyOptions: {
				algorithms: ['HS256']
			}
		})
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthStrategy]
})
export class AuthModule {}
