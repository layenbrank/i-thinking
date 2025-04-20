import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

// 用于表示MongoDB中用户文档的类型
export type UserDocument = User & Document

@Schema({
  // 使用timestamps自动生成createdAt和updatedAt字段
  timestamps: true,

  // 返回信息时，自动toJSON要把密码字段隐藏掉
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v
      delete ret._id
      delete ret.password
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v
      delete ret._id
      delete ret.password
    }
  }
})
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string

  @Prop({ required: true })
  password: string
}

export const UserSchema = SchemaFactory.createForClass(User)
