import { AppModule } from '@/app.module'
import { HttpExceptionFilter } from '@/filters/http-exception.filter'
import { ResponseInterceptor } from '@/interceptors/response-interceptor'
import {
	HttpStatus,
	UnprocessableEntityException,
	ValidationPipe,
	VersioningType,
	type ValidationPipeOptions
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

interface Configure {
	prefix: string
	version: string
}

const configure: Readonly<Configure> = {
	prefix: 'api/v',
	version: '1'
}

const validationPipe: ValidationPipeOptions = {
	transform: true,
	whitelist: true,
	// forbidNonWhitelisted: true, // 禁止 无装饰器验证的数据通过
	stopAtFirstError: true,
	errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
	transformOptions: {
		enableImplicitConversion: true
	},
	exceptionFactory(errors) {
		const [error] = errors.map(function (e) {
			if (!e.constraints) return 'exception 参数错误'
			const [rule] = Object.keys(e.constraints)
			if (!rule) return 'exception 参数错误'
			const msg = e.constraints[rule]
			return msg
		})
		return new UnprocessableEntityException(error)
	}
}

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bufferLogs: false,
		cors: true
	})

	app.useGlobalPipes(new ValidationPipe(validationPipe))
	app.useGlobalFilters(new HttpExceptionFilter())
	app.useGlobalInterceptors(new ResponseInterceptor())

	app.enableVersioning({
		type: VersioningType.URI,
		prefix: configure.prefix,
		defaultVersion: configure.version
	})

	app.enableCors({
		origin: '*',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		/* 让 NestJS 自动处理预检请求。 */
		preflightContinue: false,
		/* 设置预检请求成功时的状态码。 */
		optionsSuccessStatus: 204,
		/* 如果你的前端应用使用了凭据（cookies/session） true 允许请求携带凭据（如 cookies）。 */
		credentials: true,
		/* 预检请求的缓存时间（单位：秒）。 3600 */
		maxAge: 3600
	})

	const documentBuilder = new DocumentBuilder()
		.setTitle('Nest API')
		.setDescription('Nest API 接口文档')
		.setVersion(`v${configure.version}`)
		.addSecurity('', {
			description: 'Bearer Authorization',
			type: 'http',
			scheme: 'bearer',
			bearerFormat: 'JWT'
		})
		.addBearerAuth({
			type: 'http',
			scheme: 'bearer',
			bearerFormat: 'JWT'
		})

	const document = SwaggerModule.createDocument(app, documentBuilder.build(), {
		ignoreGlobalPrefix: false
	})

	const configService = new ConfigService()

	const PORT = configService.get<string>('PORT')
	const PROTOCOL = configService.get<string>('PROTOCOL')
	const HOSTNAME = configService.get<string>('HOSTNAME')

	const HttpURL = `${PROTOCOL}://${HOSTNAME}:${PORT}`
	const apiSuffix = `/${configure.prefix}${configure.version}`
	const docSuffix = '/api/docs'
	const info = `Server is running on ${HttpURL}${apiSuffix}`
	const docs = `Docs is running on ${HttpURL}${docSuffix}`

	SwaggerModule.setup(docSuffix, app, document)

	await app.listen(PORT ?? '3000')

	console.log('info', info)
	console.log('docs', docs)
}
void bootstrap()
