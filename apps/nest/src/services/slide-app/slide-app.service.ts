import { Injectable } from '@nestjs/common';
import { CreateSlideAppDto } from './dto/create-slide-app.dto';
import { UpdateSlideAppDto } from './dto/update-slide-app.dto';

@Injectable()
export class SlideAppService {
  create(createSlideAppDto: CreateSlideAppDto) {
    return 'This action adds a new slideApp';
  }

  findAll() {
    return `This action returns all slideApp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} slideApp`;
  }

  update(id: number, updateSlideAppDto: UpdateSlideAppDto) {
    return `This action updates a #${id} slideApp`;
  }

  remove(id: number) {
    return `This action removes a #${id} slideApp`;
  }
}
