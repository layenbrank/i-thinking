import { Injectable } from '@nestjs/common';
import { CreateConsoleDto } from './dto/create-console.dto';
import { UpdateConsoleDto } from './dto/update-console.dto';

@Injectable()
export class ConsoleService {
  create(createConsoleDto: CreateConsoleDto) {
    return 'This action adds a new console';
  }

  findAll() {
    return `This action returns all console`;
  }

  findOne(id: number) {
    return `This action returns a #${id} console`;
  }

  update(id: number, updateConsoleDto: UpdateConsoleDto) {
    return `This action updates a #${id} console`;
  }

  remove(id: number) {
    return `This action removes a #${id} console`;
  }
}
