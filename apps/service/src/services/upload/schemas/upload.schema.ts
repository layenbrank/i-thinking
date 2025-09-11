import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, type Default__v } from 'mongoose'

@Schema({
	timestamps: true,
	toJSON: {
		transform(doc, ret: Default__v<Partial<UploadDocument>>, options) {
			const { __v, path, ...sanitized } = ret
			// delete ret.__v
			delete ret.path

			return sanitized
		}
	}
})
export class Upload extends Document {
	@Prop({ required: true })
	filename!: string

	@Prop({ required: true })
	originalname!: string

	@Prop({ required: true })
	mimetype!: string

	@Prop({ required: true })
	size!: number

	@Prop({ required: true })
	path: string
}

export type UploadDocument = Upload & Document

export const UploadSchema = SchemaFactory.createForClass(Upload)
