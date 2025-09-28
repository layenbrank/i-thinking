import { decrypt, encrypt } from '@/utils/crypto.util'
import { HttpException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { InsertDTO } from './dto/insert-auth.dto'
import { User, type UserDocument } from './schemas/auth.schema'

@Injectable()
export class AuthService {
	constructor(
		@InjectModel(User.name) private readonly userModel: Model<UserDocument>,
		private readonly jwtService: JwtService
	) {}
	async signin(authDTO: InsertDTO) {
		const user = await this.userModel
			.findOne({
				username: authDTO.username
			})
			.lean()

		if (!user) throw new HttpException('用户不存在', 404)

		const isPasswordValid = decrypt(user.password) === authDTO.password
		if (!isPasswordValid) throw new HttpException('密码错误', 401)

		const token = this.jwtService.sign({
			username: user.username,
			id: user._id
		})

		// delete user.password
		// delete user.__v

		return {
			token,
			...user
		}
	}
	async signup(authDTO: InsertDTO) {
		const user = await this.userModel
			.findOne({
				username: authDTO.username
			})
			.lean()

		if (user) throw new HttpException('用户名已存在', 409)

		authDTO.password = encrypt(authDTO.password)
		const newUser = (await (await this.userModel.create(authDTO)).save()).toJSON()

		return newUser
	}
}
