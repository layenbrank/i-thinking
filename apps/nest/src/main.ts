import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
  VersioningType,
  Logger
} from '@nestjs/common'

import { resolve } from 'node:path'
import process from 'node:process'
import os from 'os'

import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module'
import { HttpExceptionFilter } from '@/filters/http-exception.filter'
import { ResponseInterceptor } from '@/interceptors/response-interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    cors: true
  })

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1'
  })

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false /* 让 NestJS 自动处理预检请求。 */,
    optionsSuccessStatus: 204 /* 设置预检请求成功时的状态码。 */,
    credentials:
      true /* 如果你的前端应用使用了凭据（cookies/session） true 允许请求携带凭据（如 cookies）。 */,
    maxAge: 3 /* 预检请求的缓存时间（单位：秒）。 3600 */
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
      // forbidNonWhitelisted: true, // 禁止 无装饰器验证的数据通过
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      stopAtFirstError: true,
      exceptionFactory(errors) {
        return new UnprocessableEntityException(
          errors.map(e => {
            const rule = Object.keys(e.constraints)[0]
            const msg = e.constraints[rule]
            return msg
          })[0]
        )
      }
    })
  )

  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor())

  const swaggerOptions = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS API 接口文档')
    .setVersion('v1')
    .addBearerAuth()
    .build()

  // const port = 3000;
  // // const hostname = '192.168.0.26';
  // const hostname = '172.20.10.4';

  // await app.listen(port, hostname, function () {
  //   console.log(`Application is running on: http://${hostname}:${port}`);
  // });

  const document = SwaggerModule.createDocument(app, swaggerOptions)
  SwaggerModule.setup('/api/docs', app, document)

  const configService = new ConfigService()

  await app.listen(configService.get('PORT'))

  const API_URL = configService.get('API_URL')
  const API_URL_PROD = configService.get('PORT')

  const info = `Server is running on http://${API_URL}:${API_URL_PROD}`
  const docs = `Docs is running on http://${API_URL}:${API_URL_PROD}/api/docs`

  console.log(info)
  console.log(docs)
}
bootstrap()
