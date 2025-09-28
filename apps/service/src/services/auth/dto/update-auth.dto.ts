import { PartialType } from '@nestjs/mapped-types'
import { InsertDTO } from './insert-auth.dto'

export class UpdateDTO extends PartialType(InsertDTO) {}
