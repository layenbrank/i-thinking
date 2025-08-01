import { Injectable, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { zip } from 'compressing'
import { basename } from 'node:path'
import { Upload, UploadDocument } from './schemas/upload.schema'
import { CreateUploadDto } from './dto/create-upload.dto'
import { UpdateUploadDto } from './dto/update-upload.dto'

@Injectable()
export class UploadService {
	constructor(
		@InjectModel(Upload.name)
		private readonly uploadModel: Model<UploadDocument>,
		private readonly configService: ConfigService
	) {}

	async uploadImageFile(file: Express.Multer.File): Promise<UploadDocument> {
		const data = await this.uploadModel.create({
			filename: basename(file.filename),
			mimetype: file.mimetype,
			// owner: req['auth']['id'],
			originalname: file.originalname,
			path: `/uploads/images/${file.filename}`,
			size: file.size
		})
		return data.save()
	}
	async uploadImageFiles(files: Array<Express.Multer.File>) {
		const uploadPromises = files.map(async (file) => {
			const uploadData = await this.uploadModel.create({
				filename: basename(file.filename),
				mimetype: file.mimetype,
				// owner: req['auth']['id'],
				originalname: file.originalname,
				path: `/uploads/images/${file.filename}`,
				size: file.size
			})

			return uploadData.save()
		})
		const uploadedDocuments = await Promise.all(uploadPromises)

		return uploadedDocuments
	}

	async findAll() {
		const data = await this.uploadModel.find()
		const url = `${this.configService.get('API_URL')}:${this.configService.get('PORT')}`
		data.forEach((item) => {
			item.path = `${url}${item.path}`
		})
		return data
	}

	findOne(id: number) {
		return `This action returns a #${id} upload`
	}

	update(id: number, updateUploadDto: UpdateUploadDto) {
		return `This action updates a #${id} upload`
	}

	remove(id: number) {
		return `This action removes a #${id} upload`
	}
}
