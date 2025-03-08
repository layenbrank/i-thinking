// import { resolve } from 'node:path';
import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ConfigService, ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsoleModule } from './services/console/console.module';
import { WidgetModule } from './services/widget/widget.module';
import { LogMiddleware } from './middleware/log/log.middleware';
import { TestModule } from './services/test/test.module';


@Module({
  imports: [
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   async useFactory(configService: ConfigService<NodeJS.ProcessEnv>) {
    //     const uri = configService.get<string>('DATABASE_URL', {
    //       infer: true,
    //     });
    //     console.log('uri', uri);
    //     if (!uri) {
    //       // throw new Error('DATABASE_URL not found in environment variables');
    //       console.log('DATABASE_URL not found in environment variables');
    //     }

    //     return {
    //       uri,
    //       retryAttempts: 3,
    //       retryDelay: 3000,
    //       verboseRetryLog: true,
    //       connectTimeoutMS: 3 * 1000,
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
    // ConfigModule.forRoot({
    //   isGlobal: true,
    //   envFilePath: [
    //     resolve(__dirname, process.cwd(), '.env'),
    //     resolve(__dirname, process.cwd(), `.env.${process.env.NODE_ENV}`),
    //   ],
    // }),
    HttpModule,
    ConsoleModule,
    WidgetModule,
    TestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogMiddleware).forRoutes('*'); // 应用到所有路由，你也可以指定特定路由
  }
}
