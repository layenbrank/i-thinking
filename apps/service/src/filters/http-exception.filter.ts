import {
	Catch,
	HttpException,
	Logger,
	type ArgumentsHost,
	type ExceptionFilter
} from '@nestjs/common'
import type { Request, Response } from 'express'

/**
 * HTTP异常过滤器
 *
 * @description
 * 捕获并处理所有HTTP异常，提供统一的错误响应格式和日志记录
 * 记录详细的错误信息，包括请求ID、方法、URL、IP、状态码、错误代码等
 *
 * @example
 * // 在main.ts中全局注册
 * app.useGlobalFilters(new HttpExceptionFilter());
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name)

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const Res = ctx.getResponse<Response>()
		const Req = ctx.getRequest<Request>()

		const method = Req.method
		const url = Req.url
		const userAgent = Req.headers['user-agent'] || '-'

		console.log(
			'ip',
			Req.ip,
			'\nmethod',
			method,
			'\nuserAgent',
			userAgent,
			'\nstringify',
			JSON.stringify(exception, null, 2)
		)

		const status = exception.getStatus()

		Res.status(status).json({
			code: status,
			msg: exception.message,
			success: false,
			data: null,
			timestamp: Date.now(),
			path: url
		})
	}
}

/*
new Date().toLocaleString('zh-CN', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false,
	timeZone: 'Asia/Shanghai'
})
*/
