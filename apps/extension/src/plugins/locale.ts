import enUS from '@/locales/en-US/index.ts'
import zhCN from '@/locales/zh-CN/index.ts'
import { createI18n } from 'vue-i18n'

type Modules = Record<string, { default: International.MessageSchema }>

type MessageModules = Record<string, International.MessageSchema>
// export type MessageSchema = typeof zhCN
// export type LanguageType = keyof typeof messages
export type MessagesStruct = Record<string, International.MessageSchema>

const messagess = {
	// zh: zhCN,
	'zh-CN': zhCN,
	// en: enUS,
	'en-US': enUS
} as const satisfies MessagesStruct

const modules: Modules = import.meta.glob('../locales/*/index.ts', {
	eager: true
})

const messages: MessageModules = {}

// const pattern = /\/locales\/([a-z]{2}-[A-Z]{2})\//
const pattern = /([a-z]{2}-[A-Z]{2})/

for (const [path, module] of Object.entries(modules)) {
	const match = pattern.exec(path)
	if (!match) continue
	const [key] = match
	if (!key) continue
	messages[key] = module.default
}

const i18n = createI18n({
	legacy: false,
	locale: navigator.language,
	fallbackLocale: 'en-US',
	globalInjection: true,
	numberFormats: {
		'zh-CN': {
			currency: {
				style: 'currency',
				currency: 'CNY',
				notation: 'standard'
			},
			decimal: {
				style: 'decimal',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			},
			percent: {
				style: 'percent',
				useGrouping: false
			}
		},
		'en-US': {
			currency: {
				style: 'currency',
				currency: 'USD',
				notation: 'standard'
			},
			decimal: {
				style: 'decimal',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			},
			percent: {
				style: 'percent',
				useGrouping: false
			}
		}
	},
	datetimeFormats: {
		'zh-CN': {
			short: {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			},
			long: {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
				hour: 'numeric',
				minute: 'numeric'
			}
		},
		'en-US': {
			short: {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			},
			long: {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				weekday: 'long',
				hour: 'numeric',
				minute: 'numeric'
			}
		}
	},
	messages: messagess,
	silentFallbackWarn: import.meta.env.PROD,
	silentTranslationWarn: import.meta.env.PROD
})

export default i18n
