import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false /* 让 NestJS 自动处理预检请求。 */,
    optionsSuccessStatus: 204 /* 设置预检请求成功时的状态码。 */,

    /* 如果你的前端应用使用了凭据（cookies/session） true 允许请求携带凭据（如 cookies）。 */
    credentials: true,
    maxAge: 3 /* 预检请求的缓存时间（单位：秒）。 3600 */,
  });

  const port = 3000;
  const hostname = '192.168.0.26';
  // const hostname = '172.20.10.4';

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

  await app.listen(port, hostname, function () {
    console.log(`Application is running on: http://${hostname}:${port}`);
  });
}
bootstrap();
