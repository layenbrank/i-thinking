import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Request to ${req.hostname}${req.path}`);

    // if (req.url.startsWith('/')) {
    //   console.log(`Request to /new-tab: ${req.url}`);
    // }
    next();
  }
}
