import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  app(): string {
    return 'Nest JS';
  }
}
