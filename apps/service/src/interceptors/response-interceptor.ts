// 导入 Injectable 装饰器，用于标记一个类为可注入的服务
import {
  Injectable,
  Logger,
  // 导入 CallHandler 接口，用于表示处理请求的处理器，它包含了请求和响应的上下文信息
  type CallHandler,
  type ExecutionContext,
  // 导入 NestInterceptor 接口，用于创建拦截器类，用于拦截和修改请求或响应数据
  type NestInterceptor
} from '@nestjs/common'
// 导入 Observable 类和 map 操作符，用于创建和操作响应流
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * 标准响应格式接口
 */
interface Response<T> {
  data: T
  code: number
  msg: string
  success: boolean
  timestamp: number
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    const ctx = context.switchToHttp()
    const Req = ctx.getRequest()
    const Res = ctx.getResponse()

    return next.handle().pipe(
      map(function (data) {
        return {
          data,
          code: 200,
          msg: '操作成功',
          success: true,
          timestamp: Date.now()
        }
      })
    )
  }
}
