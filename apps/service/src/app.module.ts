import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { ApplicationModule } from '@/services/application/application.module'
import { AuthModule } from '@/services/auth/auth.module'
import { ConsoleModule } from '@/services/console/console.module'
import { DemoModule } from '@/services/demo/demo.module'
import { PostsModule } from '@/services/posts/posts.module'
import { ProfileModule } from '@/services/profile/profile.module'
import { UploadModule } from '@/services/upload/upload.module'
import { HttpModule } from '@nestjs/axios'
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { resolve } from 'node:path'
import process from 'node:process'

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      async useFactory(configService: ConfigService<NodeJS.ProcessEnv>) {
        const uri = configService.get<string>('MONGODB_URI', {
          infer: true
        })
        console.log('uri', uri)
        if (!uri) {
          // throw new Error('MONGODB_URI not found in environment variables');
          console.log('MONGODB_URI not found in environment variables')
        }

        return {
          uri,
          retryAttempts: 3,
          retryDelay: 3000,
          verboseRetryLog: true,
          connectTimeoutMS: 3 * 1000
          // dbName: configService.get<string>('MONGODB_NAME', 'extension', {
          // 	infer: true
          // }),
          // localPort: configService.get<number>('MONGODB_PORT', 27017, {
          // 	infer: true
          // }),
        }
      },
      inject: [ConfigService]
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, process.cwd(), '.env'),
        resolve(__dirname, process.cwd(), `.env.${process.env.NODE_ENV}`)
      ]
    }),

    HttpModule,
    AuthModule,
    DemoModule,
    PostsModule,
    UploadModule,
    ProfileModule,
    ConsoleModule,
    ApplicationModule
  ],
  controllers: [AppController],
  providers: [
    AppService
    // {
    //   provide: APP_GUARD,
    //   useClass: JWTAuthGuard,
    // },
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(LogMiddleware).forRoutes('(.*)') // 应用到所有路由，你也可以指定特定路由
  }
}
