import { ApiProperty, ApiTags } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length } from 'class-validator'

@ApiTags('auth dto create')
export class InsertDTO {
  @ApiProperty({
    name: 'username',
    example: 'layen',
    description: '用户名',
    required: true
  })
  @Length(2, 12, {
    message: 'username长度必须在2到12之间'
  })
  @IsString({ message: 'username必须为字符串' })
  @IsNotEmpty({ message: 'username不能为空' })
  readonly username: string

  @ApiProperty({
    name: 'password',
    example: '123456',
    description: '密码',
    required: true
  })
  @Length(4, 20, {
    message: 'password长度必须在4到20之间'
  })
  @IsString({ message: 'password必须为字符串' })
  @IsNotEmpty({ message: 'password不能为空' })
  password: string

  // @IsEmail({}, { message: 'Not a valid email' })
  // email: string;
  // surname: string;
  // phone: string;
  // address: string;
  // city: string;
  // country: string;
  // zip: string;
  // role: string;
}
