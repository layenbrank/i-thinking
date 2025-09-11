import { User } from '@/services/auth/schemas/auth.schema'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Type } from 'class-transformer'
import { Document, Types, type Default__v } from 'mongoose'

export type PostDocument = Post & Document

@Schema({
	timestamps: true,
	toJSON: {
		virtuals: true,
		transform(doc, ret: Default__v<Partial<PostDocument>>, options) {
			// delete ret.__v
			delete ret._id
			delete ret.author?.id

			return ret
		}
	}
})
export class Post extends Document {
	@Prop({ required: true })
	title: string

	@Prop({ type: Types.ObjectId, ref: 'User', required: true }) // 关联 User 文档
	@Type(() => User)
	author: User

	@Prop({ required: true })
	content: string

	@Prop({ default: 0 })
	visits: number
}

export const PostSchema = SchemaFactory.createForClass(Post)
