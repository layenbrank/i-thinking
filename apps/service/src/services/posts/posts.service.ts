import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Request } from 'express'
import { Model } from 'mongoose'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { Post, type PostDocument } from './schemas/posts.schema'

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private readonly postsModel: Model<PostDocument>) {}
  create(req: Request, createPostDto: CreatePostDto) {
    const { title, content } = createPostDto
    // 确保 author 字段是 ObjectId 类型
    // const authorId = new Types.UUID(req.user['id'])

    const post = new this.postsModel({
      title,
      content
      // author: authorId
    })
    return post.save()
  }

  async findAll(req: Request) {
    // const authorId = new Types.UUID(req.user['id'])
    // const posts = await this.postsModel
    //   .find({
    //     author: authorId, // author posts.schema中定义的字段名
    //   })
    //   .populate({
    //     path: 'author', // author posts.schema中定义的字段名
    //     model: 'User', // posts.schema关联的对象模型名
    //     select: { username: 1 }, // 指定需要返回的字段
    //   })
    //   .exec();

    const posts = await this.postsModel
      .aggregate([
        {
          $lookup: {
            from: 'users', // 目标集合名
            localField: 'author', // 本地集合中的字段名
            foreignField: '_id', // 目标集合中的字段名
            as: 'author' // 结果保存的字段名，可以自定义名称
          }
        },
        {
          $unwind: {
            path: '$author',
            preserveNullAndEmptyArrays: true // 当 results 为空时，不移除整个文档。
          }
        },
        {
          $project: {
            title: 1,
            content: 1,
            author: '$author.username',
            createdAt: 1,
            updatedAt: 1,
            _id: 1,
            visits: 1
          }
        },
        {
          $match: {
            // author: req.user['username']
          }
        }
      ])
      .exec()
    // 将聚合结果转换为 Mongoose 文档数组
    const mongoosePosts = posts.map((post) => new this.postsModel(post))

    // 应用 toJSON 变换
    const transformedPosts = mongoosePosts.map((post) => post.toJSON())

    return transformedPosts
  }

  findOne(id: number) {
    return `This action returns a #${id} post`
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`
  }

  remove(id: number) {
    return `This action removes a #${id} post`
  }
}
