import { Injectable } from '@nestjs/common'
import { CreateDemoDto } from './dto/create-demo.dto'
import { UpdateDemoDto } from './dto/update-demo.dto'

@Injectable()
export class DemoService {
  create(createTestDto: CreateDemoDto) {
    return 'This action adds a new test'
  }

  findAll() {
    return `This action returns all test`
  }

  findOne(id: number) {
    return `This action returns a #${id} test`
  }

  update(id: number, updateTestDto: UpdateDemoDto) {
    return `This action updates a #${id} test`
  }

  remove(id: number) {
    return `This action removes a #${id} test`
  }
}
