// interface MessageSchema extends General, Operation, Validation, Feedback, Profile, Exception {}

declare namespace International {
	type Locale =
		| 'zh-CN'
		| 'zh-TW'
		| 'en-US'
		| 'es-ES'
		| 'ja-JP'
		| 'fr-FR'
		| 'de-DE'
		| 'it-IT'
		| 'ru-RU'
		| 'pt-PT'
		| 'ko-KR'
		| 'ar-SA'
		| 'hi-IN'
		| 'bn-BD'

	type Direction = 'ltr' | 'rtl'
	// type DateFormat = 'short' | 'medium' | 'long' | 'full'

	interface MessageSchema {
		[key: string]: any
		General: General
		Profile: Profile
		Message: Message
		Feedback: Feedback
		Exception: Exception
		Operation: Operation
		Validation: Validation
	}

	interface Exception {
		Network: string
		Timeout: string
		Unauthorized: string
		Forbidden: string
		NotFound: string
		Server: string
		Unknown: string
	}

	interface General {
		Landing: string
		Overview: string
		Portal: string
		Dashboard: string
		Settings: string
		Help: string

		Game: string
		'AI-Hub': string
		Application: string
		Customization: string

		Edit: string
		Language: string
		Mirror: string
		Window: string
		'Please-Enter-Keywords': string
		Show: string
		Week: {
			Min: {
				Mon: string
				Tue: string
				Wed: string
				Thu: string
				Fri: string
				Sat: string
				Sun: string
			}
			Max: {
				Monday: string
				Tuesday: string
				Wednesday: string
				Thursday: string
				Friday: string
				Saturday: string
				Sunday: string
			}
		}

		Bold: string
		Italic: string
		Strike: string
		Code: string
		Paragraph: string
		Heading: string
		Undo: string
		Redo: string
		Blockquote: string
		Purple: string
		Export: string
		Ordered: string
		Bulleted: string
		'Hard-Break': string
		'Clear-Marks': string
		'Clear-Nodes': string
		'Code-Block': string
		'Horizontal-Rule': string
	}

	interface Operation {
		Save: string
		Cancel: string
		Confirm: string
		Delete: string
		Edit: string
		View: string
		Search: string
		Export: string
		Import: string
		Refresh: string
	}

	interface Validation {
		Required: string
		Email: string
		Phone: string
		MinLength: string
		MaxLength: string
		Pattern: string
		Numeric: string
		Interval: string
	}

	interface Feedback {
		Loading: string
		Success: string
		Error: string
		Warning: string
		Pending: string
	}

	interface Message {
		Login: string
		Logout: string
		Save: string
		Delete: string
		Update: string
	}

	interface Profile {
		Username: string
		Password: string
		FullName: string
		Email: string
		Role: string
		Permissions: string
		LastLogin: string
		Logout: string
		UpdateProfile: string
	}
}
