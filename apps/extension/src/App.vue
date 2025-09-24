<script setup lang="ts">
import type { LanguageType } from '@/plugins/locale-copy'
import { theme } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import type { Locale } from 'ant-design-vue/es/locale'
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { useI18n } from 'vue-i18n'
// import { GET_APPLICATION, GET_FAVICON, GET_SINGLETON } from '@/apis/application.ts'

defineOptions({
	name: 'App'
})

const { locale, t } = useI18n()

dayjs.locale('zh-cn')

// dayjs.locale('en-us')

console.log('locale', locale.value, '\nt', t('Message.Update'), '\nnavigator', navigator.language)

const languageMap: Record<string, Locale> = {
	zh: zhCN,
	'zh-CN': zhCN,
	en: enUS,
	'en-US': enUS
}

const themeConfigure: ThemeConfig = {
	algorithm: theme.defaultAlgorithm,
	token: {
		colorPrimary: '#4080ff'
	},
	components: {
		Button: {
			// algorithm: true
		},
		Input: {
			// algorithm: true
		},
		Layout: {
			// algorithm: true,
			colorBgHeader: '#000000',
			colorBorderBg: '#f5f5f5'
			// headerBg: '#000000',
			// bodyBg: '#f5f5f5',
			// footerBg: '#ffffff'
		},
		Menu: {
			// algorithm: true,
			// itemBg: '#000000',
			colorItemBg: '#000000',
			colorText: '#ffffff'
		}
	}
}

// GET_APPLICATION().subscribe(function (resp) {
// 	console.log('application', resp)
// })
// // const navigation='https://www.baidu.com/'
// const navigation = 'https://weixin.qq.com/'
// GET_FAVICON(navigation).subscribe(function (resp) {
// 	console.log('favicon', resp)
// })

// GET_SINGLETON('3').subscribe(function (resp) {
// 	console.log('singleton', resp)
// })

onBeforeMount(function () {
	const LANGUAGE = navigator.language as LanguageType
	locale.value = LANGUAGE
})
</script>

<template>
	<a-config-provider
		:theme="themeConfigure"
		:locale="languageMap[locale]"
		class="top-floor-config-provider"
	>
		<a-style-provider hash-priority="low">
			<a-app class="top-floor-app">
				<a-spin :spinning="false" tip="Loading..." wrapperClassName="top-floor-spin-wrapper">
					<router-view />
				</a-spin>
			</a-app>
		</a-style-provider>
	</a-config-provider>
</template>

<style lang="scss" scoped>
%screen-full {
	@apply w-full h-full;
}

.top-floor-app {
	@extend %screen-full;
}

.top-floor-spin-wrapper {
	@extend %screen-full;

	& > :deep(.ant-spin-container) {
		@extend %screen-full;
	}
}
</style>
