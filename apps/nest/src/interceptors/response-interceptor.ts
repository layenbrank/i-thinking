// 导入 Injectable 装饰器，用于标记一个类为可注入的服务
import {
  Injectable,
  // 导入 NestInterceptor 接口，用于创建拦截器类，用于拦截和修改请求或响应数据
  NestInterceptor,
  // 导入 CallHandler 接口，用于表示处理请求的处理器，它包含了请求和响应的上下文信息
  CallHandler,
  type ExecutionContext,
  Logger
} from '@nestjs/common'
// 导入 Observable 类和 map 操作符，用于创建和操作响应流
import { Observable } from 'rxjs'
import { map, tap } from 'rxjs/operators'

/**
 * 标准响应格式接口
 */
interface Response<T> {
  data: T
  code: number
  message: string
  success: boolean
  timestamp: string
  requestId: string
}

/**
 * 响应拦截器
 *
 * @description
 * 拦截所有响应并统一格式化，提供一致的API响应结构
 * 记录响应时间、状态码等信息
 *
 * @example
 * // 在main.ts中全局注册
 * app.useGlobalInterceptors(new ResponseInterceptor());
 *
 * // 响应格式示例
 * {
 *   "data": { ... },
 *   "code": 200,
 *   "message": "success",
 *   "success": true,
 *   "timestamp": "2023-01-01T00:00:00.000Z",
 *   "requestId": "req-123456789"
 * }
 */
@Injectable()
// 创建一个名为 ResponseInterceptor 的拦截器类，用于统一处理响应数据格式
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name)

  /**
   * 拦截方法
   *
   * @param context - 执行上下文，包含请求和响应信息
   * @param next - 调用处理器，处理请求并返回响应
   * @returns 格式化后的响应Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest()
    const response = ctx.getResponse()

    // 获取请求信息
    const clientIp = request['clientIp'] || request.ip || 'unknown'
    const requestId = request['requestId'] || request.headers['x-request-id'] || 'unknown'
    const method = request.method
    const url = request.url

    // 获取用户信息（如果存在）
    let userId = ''
    if (request.user) {
      const user = request.user as any
      userId = user.id || user.username || ''
    }

    // 确保响应头中包含请求ID
    response.setHeader('x-request-id', requestId)

    const startTime = Date.now()

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime
        const statusCode = response.statusCode

        // 记录响应日志
        this.logger.log(
          `${method} ${url} - 拦截器 - ${statusCode} - IP: ${clientIp}${userId ? ` - User: ${userId}` : ''} - ReqID: ${requestId} - Time: ${responseTime}ms`,
          {
            context: 'HTTP',
            requestId,
            method,
            url,
            statusCode,
            responseTime,
            ip: clientIp,
            userId: userId || undefined,
            type: 'interceptor-response'
          }
        )
      }),
      map(data => ({
        data,
        code: 200,
        message: 'success',
        success: true,
        timestamp: new Date().toISOString(),
        requestId
      }))
    )
  }
}
