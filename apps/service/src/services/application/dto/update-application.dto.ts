import { PartialType } from '@nestjs/mapped-types'
import { InsertDTO } from './create-application.dto'

export class UpdateDTO extends PartialType(InsertDTO) {}
