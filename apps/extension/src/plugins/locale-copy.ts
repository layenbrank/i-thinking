import enUS from '@/locales/en-US.json' with { type: 'json' }
import zhCN from '@/locales/zh-CN.json' with { type: 'json' }
import { createI18n } from 'vue-i18n'

export type MessageSchema = typeof zhCN
export type LanguageType = keyof typeof messages
export type MessagesType = Record<string, MessageSchema>

const messages = {
	zh: zhCN,
	'zh-CN': zhCN,
	en: enUS,
	'en-US': enUS
} as const satisfies MessagesType

const locale = createI18n<[MessageSchema], LanguageType>({
	legacy: false,
	locale: navigator.language as LanguageType,
	fallbackLocale: 'en-US',
	globalInjection: true,
	messages
})

export default locale
