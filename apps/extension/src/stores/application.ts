import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { isEmpty } from 'lodash-es'
import { defineStore } from 'pinia'
import { from, tap } from 'rxjs'
import { ref } from 'vue'

const DEFAULT: readonly Application[] = [
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 1,
		component: 'bookmark',
		width: '60px',
		height: '60px',
		size: 'mini',
		// direction: 'horizontal',
		direction: 'vertical',
		// shape: 'rectangle',
		// shape: 'square',
		shape: 'circle',
		round: '12px',
		name: '书签',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '书签测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 2,
		component: 'calendar',
		width: '60px',
		height: '60px',
		size: 'medium',
		direction: 'horizontal',
		// shape: 'square',
		shape: 'rectangle',
		round: '12px',
		name: '日历',
		marker: '',
		backgroundColor: '#fff',
		backgroundImage: null,
		// backgroundImage: SlideView,
		textSize: '13px',
		textColor: '#ffffff',
		description: '日历测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 3,
		component: 'marketplace',
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
		marker: '',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '应用商店测试',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 3,
		component: 'navigation',
		url: 'https://www.baidu.com',
		size: 'mini',
		round: '8px',
		width: '60px',
		height: '60px',
		direction: 'horizontal',
		shape: 'square',
		name: '百度',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '百度',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 5,
		component: 'navigation',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '微信',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '微信',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 6,
		component: 'example',
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
		name: 'example',
		backgroundColor: '#ffffff4d',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: 'example',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 7,
		component: 'markdown',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '备忘录',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '备忘录',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 8,
		component: 'settings',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '设置',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '设置',
		downloadCount: 1000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 9,
		component: 'intelligence',
		width: '60px',
		height: '60px',
		url: 'https://weixin.qq.com',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: 'AI Hub',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: 'AI Hub',
		downloadCount: 100000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 9,
		component: 'clipchamp',
		width: '60px',
		height: '60px',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: 'Clipchamp',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: 'Clipchamp',
		downloadCount: 100000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	},
	{
		id: window.crypto.randomUUID(),
		mirrorID: window.crypto.randomUUID(),
		sort: 9,
		component: 'collection',
		width: '60px',
		height: '60px',
		size: 'mini',
		round: '20px',
		direction: 'horizontal',
		shape: 'square',
		name: '应用集合',
		backgroundColor: '#ffffff',
		backgroundImage: null,
		textSize: '13px',
		textColor: '#ffffff',
		description: '应用集合',
		downloadCount: 100000,
		updatedAt: Date.now(),
		createdAt: Date.now()
	}
]

export const useApplicationStore = defineStore('application', function () {
	const application = ref<Application | null>(null)

	const applications = useObservable(
		from(
			liveQuery(function () {
				// void database.application.where("id+mirrorID")
				return database.application.orderBy('sort').toArray()
				// return database.application.offset(1).limit(30).sortBy('sort')
			})
		).pipe(
			tap(function (response) {
				if (isEmpty(response)) void database.application.bulkAdd(DEFAULT)
				console.log('[useObservable applications]', response)
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

	async function toUpdate(ID: string, updates: Partial<Application>) {
		const application = await database.application.get(ID)
		if (!application) return
		const updateSpec = {
			...application,
			...updates,
			updatedAt: Date.now()
		}
		return database.application.update(ID, updateSpec)
	}

	function toInsert(application: Application) {
		return database.application.add(application)
	}

	function toUpdates(applications: Application[]) {
		return database.application.bulkPut(applications)
	}

	return {
		application,
		applications,
		toUpdate,
		toUpdates,
		toInsert
	}
})
