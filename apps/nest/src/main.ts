import { resolve } from 'node:path';

import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
  VersioningType,
  Logger,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@/filters/http-exception.filter';
import { ResponseInterceptor } from '@/interceptors/response-interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    cors: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'metrics'],
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false /* 让 NestJS 自动处理预检请求。 */,
    optionsSuccessStatus: 204 /* 设置预检请求成功时的状态码。 */,

    /* 如果你的前端应用使用了凭据（cookies/session） true 允许请求携带凭据（如 cookies）。 */
    credentials: true,
    maxAge: 3 /* 预检请求的缓存时间（单位：秒）。 3600 */,
  });

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
          errors.map((e) => {
            const rule = Object.keys(e.constraints!)[0];
            const msg = e.constraints![rule];
            return msg;
          })[0],
        );
      },
    }),
  );

  // 使用Winston日志记录器
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  /**
   * @description 静态资源托管
   * 双重配置确保资源正常加载
   */
  const staticPathTab = resolve(process.cwd(), 'static/new-tab/');

  app.useStaticAssets(staticPathTab, {
    prefix: '/new-tab',
    redirect: true,
  });

  // 添加一个不带前缀的静态资源路径，用于加载 assets 等资源
  app.useStaticAssets(staticPathTab);

  const staticPath360 = resolve(process.cwd(), 'static/360-Safeguard');

  app.useStaticAssets(staticPath360, {
    prefix: '/360-Safeguard',
    redirect: true,
  });

  app.useStaticAssets(staticPath360);

  const staticPathTest = resolve(process.cwd(), 'static/test');

  app.useStaticAssets(staticPathTest, {
    prefix: '/test',
    redirect: true,
  });

  app.useStaticAssets(staticPathTest);

  const swaggerOptions = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS API 接口文档')
    .setVersion('v1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('/api/docs', app, document);

  const configService = new ConfigService();

  await app.listen(configService.get('PORT'));
  const info = `Server is running on http://${configService.get('API_URL')}:${configService.get('PORT')}`;
  const docs = `Docs is running on http://${configService.get('API_URL')}:${configService.get('PORT')}/api/docs`;
  console.log(info);
  console.log(docs);

  return app;
}
bootstrap();
