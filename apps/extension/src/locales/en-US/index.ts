import Exception from './exception.ts'
import Feedback from './feedback.ts'
import General from './general.ts'
import Message from './message.ts'
import Operation from './operation.ts'
import Profile from './profile.ts'
import Validation from './validation.ts'

const enUS: International.MessageSchema = {
	General,
	Profile,
	Message,
	Feedback,
	Exception,
	Operation,
	Validation
} as const

export default enUS
