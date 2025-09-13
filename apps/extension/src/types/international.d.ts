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
		// [key: string]: any
		general: General
		profile: Profile
		message: Message
		feedback: Feedback
		exception: Exception
		operation: Operation
		validation: Validation
	}

	interface Exception {
		network: string
		timeout: string
		unauthorized: string
		forbidden: string
		notFound: string
		server: string
		unknown: string
	}

	interface General {
		landing: string
		overview: string
		portal: string
		dashboard: string
		settings: string
		help: string

		edit: string
		help: string
		language: string
		mirror: string
		window: string
		'please-enter-keywords': string
		show: string
		week: {
			min: {
				Mon: string
				Tue: string
				Wed: string
				Thu: string
				Fri: string
				Sat: string
				Sun: string
			}
			max: {
				Monday: string
				Tuesday: string
				Wednesday: string
				Thursday: string
				Friday: string
				Saturday: string
				Sunday: string
			}
		}
	}

	interface Operation {
		save: string
		cancel: string
		confirm: string
		delete: string
		edit: string
		view: string
		search: string
		export: string
		import: string
		refresh: string
	}

	interface Validation {
		required: string
		email: string
		phone: string
		minLength: string
		maxLength: string
		pattern: string
		numeric: string
		interval: string
	}

	interface Feedback {
		loading: string
		success: string
		error: string
		warning: string
		pending: string
	}

	interface Profile {
		username: string
		password: string
		fullName: string
		email: string
		role: string
		permissions: string
		lastLogin: string
		logout: string
		updateProfile: string
	}

	interface Message {
		login: string
		logout: string
		save: string
		delete: string
		update: string
	}
}
