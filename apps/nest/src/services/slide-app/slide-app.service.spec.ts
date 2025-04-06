import { Test, TestingModule } from '@nestjs/testing';
import { SlideAppService } from './slide-app.service';

describe('SlideAppService', () => {
  let service: SlideAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlideAppService],
    }).compile();

    service = module.get<SlideAppService>(SlideAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
