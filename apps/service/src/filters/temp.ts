import {
  Catch,
  HttpException,
  HttpStatus,
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

  /**
   * 捕获并处理HTTP异常
   *
   * @param exception - 捕获的HTTP异常
   * @param host - 提供请求/响应上下文的参数主机
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // 获取客户端 IP 地址（从中间件中获取或回退到请求对象的 IP）
    // const clientIp = request['clientIp'] || request.ip || 'unknown'
    // const requestId = request['requestId'] || request.headers['x-request-id'] || 'unknown'
    const method = request.method
    const url = request.url
    const userAgent = request.headers['user-agent'] || '-'

    // 获取用户信息（如果存在）
    let userId = ''
    if (request.user) {
      const user = request.user as any
      userId = user.id || user.username || ''
    }

    // 获取异常状态和消息
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' }

    // 提取错误消息和代码
    let message: string
    let errorCode: string | number = status

    if (typeof errorResponse === 'string') {
      message = errorResponse
    } else if (typeof errorResponse === 'object') {
      message = (errorResponse as any).message || 'An error occurred'
      errorCode = (errorResponse as any).code || (errorResponse as any).errorCode || status
    } else {
      message = 'An error occurred'
    }

    // 记录错误日志
    const logMethod = status >= 500 ? 'error' : 'warn'
    // this.logger[logMethod](
    // 	// `${method} ${url} - 错误 ${status} - IP: ${clientIp}${userId ? ` - User: ${userId}` : ''} - ReqID: ${requestId} - ${message}`,
    // 	{
    // 		context: 'HTTP',
    // 		// requestId,
    // 		method,
    // 		url,
    // 		statusCode: status,
    // 		errorCode,
    // 		message,
    // 		// ip: clientIp,
    // 		userId: userId || undefined,
    // 		type: 'request-error',
    // 		errorType: status >= 500 ? 'server-error' : 'client-error',
    // 		query: this.sanitizeObject(request.query),
    // 		...(process.env.NODE_ENV === 'development'
    // 			? { body: this.sanitizeObject(request.body) }
    // 			: {}),
    // 		stack: exception.stack
    // 	}
    // )

    // 返回统一的错误响应格式
    response.status(status).json({
      code: errorCode,
      message: message,
      success: false,
      data: null,
      timestamp: new Date().toISOString(),
      path: url
      // requestId
    })
  }

  /**
   * 清理对象中的敏感信息
   * 移除密码、令牌等敏感字段，防止日志中泄露敏感信息
   *
   * @param obj - 需要清理的对象
   * @returns 清理后的对象
   * @private
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    const sanitized = { ...obj }
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'key',
      'authorization'
    ]

    for (const key in sanitized) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key])
      }
    }

    return sanitized
  }
}
