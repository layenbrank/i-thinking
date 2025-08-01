import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import {
	ApiOperation,
	ApiBearerAuth,
	ApiParam,
	ApiQuery,
	ApiBody,
	ApiResponse,
	ApiTags,
	ApiProperty
} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { CreateAuthDto } from './dto/create-auth.dto'
import { UpdateAuthDto } from './dto/update-auth.dto'
import { NoAuthToken } from '@/decorator/noAuthToken.decorator'

@ApiTags('Auth API 模块')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@NoAuthToken()
	@Post('signin')
	@ApiBody({ type: CreateAuthDto, required: true })
	@ApiProperty({ example: { username: 'admin', password: '123456' } })
	@ApiResponse({ status: 201, description: '登录成功' })
	@ApiOperation({ summary: '登录' })
	create(@Body() createAuthDto: CreateAuthDto) {
		return this.authService.signin(createAuthDto)
	}

	@NoAuthToken()
	@Post('signup')
	@ApiBody({ type: CreateAuthDto })
	@ApiResponse({ status: 201, description: '注册成功' })
	@ApiOperation({ summary: '注册', description: 'username为唯一标识' })
	signup(@Body() createAuthDto: CreateAuthDto) {
		return this.authService.signup(createAuthDto)
	}
}
