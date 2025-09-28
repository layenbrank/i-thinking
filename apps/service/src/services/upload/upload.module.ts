import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Upload, UploadSchema } from './schemas/upload.schema'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: Upload.name,
				schema: UploadSchema
			}
		])
	],
	controllers: [UploadController],
	providers: [UploadService]
})
export class UploadModule {}
