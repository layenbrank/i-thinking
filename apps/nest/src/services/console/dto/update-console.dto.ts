import { PartialType } from '@nestjs/mapped-types';
import { CreateConsoleDto } from './create-console.dto';

export class UpdateConsoleDto extends PartialType(CreateConsoleDto) {}
