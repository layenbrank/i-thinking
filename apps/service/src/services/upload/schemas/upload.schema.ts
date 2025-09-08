import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({
	timestamps: true,
	toJSON: {
		transform: (_, ret: UploadDocument & { __v }) => {
			delete ret.__v
			delete ret.path
		}
	}
})
export class Upload extends Document {
	@Prop({ required: true })
	filename: string

	@Prop({ required: true })
	originalname: string

	@Prop({ required: true })
	mimetype: string

	@Prop({ required: true })
	size: number

	@Prop({ required: true })
	path: string
}

export type UploadDocument = Upload & Document

export const UploadSchema = SchemaFactory.createForClass(Upload)
