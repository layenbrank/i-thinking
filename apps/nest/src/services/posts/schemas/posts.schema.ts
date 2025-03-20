import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '@/services/auth/schemas/auth.schema'
import { Type } from 'class-transformer'

export type PostDocument = Post & Document

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.__v
      delete ret._id
      delete ret.author.id
    }
  }
})
export class Post extends Document<Types.ObjectId> {
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
