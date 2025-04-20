import { HttpException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { CreateAuthDto } from './dto/create-auth.dto'
import { UpdateAuthDto } from './dto/update-auth.dto'
import { User, UserDocument } from './schemas/auth.schema'
import { encrypt, decrypt } from '@/utils/crypto.util'
import type { Model } from 'mongoose'

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService
  ) {}
  async signin(createAuthDto: CreateAuthDto) {
    const user = await this.userModel
      .findOne({
        username: createAuthDto.username
      })
      .lean()

    if (!user) throw new HttpException('用户不存在', 404)

    const isPasswordValid = decrypt(user.password) === createAuthDto.password
    if (!isPasswordValid) throw new HttpException('密码错误', 401)

    const token = this.jwtService.sign({
      username: user.username,
      id: user._id
    })

    delete user.password
    delete user.__v

    return {
      token,
      ...user
    }
  }
  async signup(createAuthDto: CreateAuthDto) {
    const user = await this.userModel
      .findOne({
        username: createAuthDto.username
      })
      .lean()

    if (user) throw new HttpException('用户名已存在', 409)

    createAuthDto.password = encrypt(createAuthDto.password)
    const newUser = (await (await this.userModel.create(createAuthDto)).save()).toJSON()

    return newUser
  }
}
