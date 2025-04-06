import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { User, UserSchema } from './schemas/auth.schema'
import { jwtConstants } from '@/constants/jwt.constants'
import { JwtAuthStrategy } from './jwt-auth.strategy'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
      verifyOptions: { algorithms: ['HS256'] }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthStrategy]
})
export class AuthModule {}
