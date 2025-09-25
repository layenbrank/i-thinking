import { database } from '@/database/database.ts'
import { randomID } from '@/utils/generate.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { isEmpty } from 'lodash-es'
import { defineStore } from 'pinia'
import { from, tap } from 'rxjs'
import { ref } from 'vue'

const DEFAULT: readonly Application[] = [
	{
		id: randomID(),
		slideID: randomID(),
		sort: 1,
		component: 'app-bookmark',
		width: '60px',
		height: '60px',
		size: 'mini',
		// direction: 'horizontal',
		direction: 'vertical',
		// shape: 'rectangle',
		// shape: 'square',
		shape: 'circle',
		round: '12px',
		icon: 'https://cdn.jsdelivr.net/gh/vuejs/vuejs.org@master/public/images/favicon.ico',
		name: '书签',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '书签测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 2,
		component: 'app-calendar',
		width: '60px',
		height: '60px',
		size: 'medium',
		direction: 'horizontal',
		// shape: 'square',
		shape: 'rectangle',
		round: '12px',
		name: '日历',
		icon: '',
		backgroundColor: '#fff',
		backgroundImage: null,
		// backgroundImage: SlideView,
		textSize: '13px',
		textColor: '#ffffff',
		description: '日历测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 3,
		component: 'app-store',
		width: '60px',
		height: '60px',
		// round: null,
		round: '15px',

		size: 'mini',
		// size: 'small',
		// size: 'medium',
		// size: 'large',

		// direction: 'horizontal',
		direction: 'vertical',

		// shape: 'circle',
		shape: 'square',
		// shape: 'rectangle',

		name: '应用商店',
		icon: '',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '应用商店测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 3,
		component: 'app-navigation',
		url: 'https://www.baidu.com',
		size: 'mini',
		round: '8px',
		width: '60px',
		height: '60px',
		direction: 'horizontal',
		shape: 'square',
		name: 'app-navigation-百度',
		icon: 'https://www.baidu.com/favicon.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 5,
		component: 'app-navigation',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '微信',
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: 'app-navigation-测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 6,
		component: 'app-example',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		round: '12px',
		size: 'mini',
		// size: 'small',
		// size: 'medium',
		// size: 'large',
		// size: 'huge',
		// size: 'massive',
		// size: 'ultra',
		// direction: 'horizontal',
		direction: 'vertical',
		// shape: 'square',
		// shape: 'rectangle',
		shape: 'circle',
		name: 'app-example-微信',
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '测试',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 5,
		component: 'app-markdown',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '备忘录',
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '设置',
		downloadCount: 1000
	},
	{
		id: randomID(),
		slideID: randomID(),
		sort: 5,
		component: 'app-settings',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '设置',
		icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '设置',
		downloadCount: 1000
	}
]

export const useApplicationsStore = defineStore('app', function () {
	const activeApp = ref<Application | null>(null)

	const settingsVisible = ref(false)

	const windows = ref<Application[]>([])

	const applications = useObservable(
		from(
			liveQuery(function () {
				return database.application.orderBy('sort').toArray()
				// console.log('database', database.application)
				// return database.application.offset(1).limit(30).sortBy('sort')
			})
		).pipe(
			tap(function (response) {
				if (isEmpty(response)) void database.application.bulkAdd(DEFAULT)
				console.log('applications', response)
			})
		)
	)

	// interval(3000).subscribe(async function () {
	// 	console.log('database', database.app)
	// 	const resp = await database.app.toArray().then(function (apps) {
	// 		console.log('apps', apps)
	// 	})
	// 	if (isEmpty(resp)) database.app.bulkAdd(DEFAULT)
	// })

	async function toUpdate(appID: string, updates: Partial<Application>) {
		const app = await database.application.get(appID)
		if (app) return database.application.update(appID, { ...app, ...updates })
		else return database.application.add({ ...updates, id: appID } as Application)
	}

	function updateApplications(applications: Application[]) {
		// database.application.bulkGet

		return database.application.bulkPut(applications)
	}

	return {
		windows,
		applications,
		toUpdate,
		updateApplications,

		activeApp,
		settingsVisible
	}
})
