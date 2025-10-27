import { AuthToken } from '@/decorators/auth-token.decorator'
import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { InsertDTO } from './dto/insert-auth.dto'

@ApiTags('Auth API 模块')
@Controller('auth')
export class AuthController {
	constructor(private readonly service: AuthService) {}

	@AuthToken()
	@Post('signin')
	@ApiBody({ type: InsertDTO, required: true })
	@ApiProperty({ example: { username: 'admin', password: '123456' } })
	@ApiResponse({ status: 201, description: '登录成功' })
	@ApiOperation({ summary: '登录' })
	create(@Body() authDTO: InsertDTO) {
		return this.service.signin(authDTO)
	}

	@AuthToken()
	@Post('signup')
	@ApiBody({ type: InsertDTO })
	@ApiResponse({ status: 201, description: '注册成功' })
	@ApiOperation({ summary: '注册', description: 'username为唯一标识' })
	signup(@Body() authDTO: InsertDTO) {
		return this.service.signup(authDTO)
	}
}
