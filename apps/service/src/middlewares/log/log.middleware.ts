import { Injectable, type NestMiddleware } from '@nestjs/common'
import { type NextFunction, type Request, type Response } from 'express'

/**
 * 日志中间件
 *
 * @description
 * 处理所有HTTP请求的日志记录，包括请求开始、完成和错误情况
 * 记录请求ID、方法、URL、IP、用户代理、响应状态码、响应时间等信息
 *
 * @example
 * // 在AppModule中注册中间件
 * configure(consumer: MiddlewareConsumer) {
 *   consumer.apply(LogMiddleware).forRoutes('*');
 * }
 */
@Injectable()
export class LogMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		console.log(`Request to ${req.hostname}${req.path}`)

		// if (req.url.startsWith('/')) {
		//   console.log(`Request to /new-tab: ${req.url}`);
		// }
		next()
	}
}
