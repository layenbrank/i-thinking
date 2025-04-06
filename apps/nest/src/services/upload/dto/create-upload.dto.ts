import { IsNotEmpty } from 'class-validator'

export class CreateUploadDto {
  @IsNotEmpty()
  tags: string
}
