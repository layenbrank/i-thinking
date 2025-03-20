import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

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
  private readonly logger = new Logger(LogMiddleware.name)

  /**
   * 中间件处理函数
   *
   * @param request - Express请求对象
   * @param response - Express响应对象
   * @param next - Express下一个中间件函数
   */
  use(request: Request, response: Response, next: NextFunction): void {
    // 获取请求开始时间
    const startTime = Date.now()

    // 生成或获取请求ID
    const requestId =
      request.headers['x-request-id'] || `req-${Date.now()}-${this.generateShortId()}`
    request['requestId'] = requestId
    response.setHeader('x-request-id', requestId)

    // 获取客户端IP
    const clientIp = this.getClientIp(request)
    request['clientIp'] = clientIp

    // 获取请求信息
    const { method, originalUrl } = request
    const userAgent = request.headers['user-agent'] || '-'

    // 记录请求开始的日志
    this.logger.log(
      `${method} ${originalUrl} - 开始 - IP: ${clientIp} - ReqID: ${requestId} - UA: ${userAgent.substring(0, 50)}`,
      {
        context: 'HTTP',
        requestId,
        method,
        url: originalUrl,
        ip: clientIp,
        userAgent: userAgent.substring(0, 100),
        type: 'request-start'
      }
    )

    // 处理响应结束事件
    response.on('finish', () => {
      // 计算响应时间
      const responseTime = Date.now() - startTime

      // 获取响应信息
      const { statusCode } = response
      const contentLength = response.getHeader('content-length') || 0

      // 获取用户ID（如果存在）
      let userId = ''
      if (request.user) {
        const user = request.user as any
        userId = user.id || user.username || ''
      }

      // 记录完整的结构化日志
      this.logger.log(
        `${method} ${originalUrl} - 完成 - IP: ${clientIp} - ReqID: ${requestId}${userId ? ` - User: ${userId}` : ''} - Status: ${statusCode} - Time: ${responseTime}ms - Length: ${contentLength}`,
        {
          context: 'HTTP',
          requestId,
          method,
          url: originalUrl,
          statusCode,
          responseTime,
          contentLength,
          ip: clientIp,
          userId: userId || undefined,
          userAgent: userAgent.substring(0, 100) || undefined,
          type: 'request-complete'
        }
      )

      // 对于错误响应，记录更详细的信息
      if (statusCode >= 400) {
        const logMethod = statusCode >= 500 ? 'error' : 'warn'
        this.logger[logMethod](
          `${method} ${originalUrl} - 错误 ${statusCode} - IP: ${clientIp}${userId ? ` - User: ${userId}` : ''} - ReqID: ${requestId} - Time: ${responseTime}ms`,
          {
            context: 'HTTP',
            requestId,
            method,
            url: originalUrl,
            statusCode,
            responseTime,
            ip: clientIp,
            userId: userId || undefined,
            type: 'request-error',
            errorType: statusCode >= 500 ? 'server-error' : 'client-error'
          }
        )
      }
    })

    // 继续处理请求
    next()
  }

  /**
   * 生成短ID
   * 用于请求ID的一部分，确保唯一性和可读性
   *
   * @returns 8位随机字符串
   * @private
   */
  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  /**
   * 获取客户端IP地址
   * 处理各种代理情况，尝试获取真实客户端IP
   *
   * @param request - Express请求对象
   * @returns 客户端IP地址
   * @private
   */
  private getClientIp(request: Request): string {
    // 尝试从各种头部获取IP
    const xForwardedFor = request.headers['x-forwarded-for']
    if (xForwardedFor) {
      // 如果是逗号分隔的列表，取第一个（最初的客户端）
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]
      return ips.trim()
    }

    // 尝试其他常见的代理头
    const xRealIp = request.headers['x-real-ip']
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp
    }

    // 回退到请求对象的IP
    return request.ip || request.connection.remoteAddress || '127.0.0.1'
  }
}
