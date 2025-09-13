import exception from './exception.ts'
import feedback from './feedback.ts'
import general from './general.ts'
import message from './message.ts'
import operation from './operation.ts'
import profile from './profile.ts'
import validation from './validation.ts'

export default {
	general,
	profile,
	message,
	feedback,
	exception,
	operation,
	validation
} as const
