<script setup lang="ts">
// import { GET_APPLICATION, GET_FAVICON, GET_SINGLETON } from '@/apis/application.ts'
// import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
// dayjs.locale('en-us')

defineOptions({
	name: 'App'
})

const locale = zhCN
// const locale = enUS

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
</script>

<template>
	<a-config-provider :locale="locale" class="top-floor-config-provider">
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
