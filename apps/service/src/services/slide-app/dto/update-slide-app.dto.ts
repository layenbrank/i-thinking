import { PartialType } from '@nestjs/mapped-types'
import { CreateSlideAppDto } from './create-slide-app.dto'

export class UpdateSlideAppDto extends PartialType(CreateSlideAppDto) {}
