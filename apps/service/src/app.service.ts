import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
	toRead(): string {
		return 'Hello World!'
	}
}
