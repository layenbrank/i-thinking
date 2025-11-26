const VALUES: { label: string; value: Application.Component }[] = [
	{ label: '书签', value: 'bookmark' },
	{ label: '日历', value: 'calendar' },
	{ label: '应用商店', value: 'marketplace' },
	{ label: '百度', value: 'navigation' },
	{ label: '微信', value: 'navigation' },
	{ label: 'example', value: 'example' },
	{ label: '备忘录', value: 'markdown' },
	{ label: '设置', value: 'settings' },
	{ label: 'AI Hub', value: 'intelligence' },
	{ label: 'Clipchamp', value: 'clipchamp' },
	{ label: '应用集合', value: 'collection' },
	{ label: '开发者', value: 'developer' },
	{ label: '导航', value: 'navigation' },
	{ label: '图库', value: 'gallery' },
	{ label: '时钟', value: 'clock' }
]

function ReBuild() {
	const MIRROR_ID = window.crypto.randomUUID()

	const MIRRORS: readonly Mirror[] = Array.from({ length: 1 }).map(function () {
		const mirror: Mirror = {
			id: MIRROR_ID,
			name: '镜像-01',
			index: 0,
			marker: '',
			description: '默认镜像',
			updatedAt: Date.now(),
			createdAt: Date.now()
		}

		return mirror
	})

	const APPLICATIONS: readonly Application[] = VALUES.map(function (value) {
		const application: Application = {
			id: window.crypto.randomUUID(),
			mirrorID: MIRROR_ID,
			index: 1,
			component: value.value,
			width: '60px',
			height: '60px',
			size: 'mini',
			direction: 'horizontal',
			shape: 'rectangle',
			round: '12px',
			name: value.label,
			backgroundColor: '#ffffff',
			backgroundImage: null,
			textSize: '13px',
			textColor: '#ffffff',
			description: `${value.label}测试`,
			downloadCount: 1000,
			updatedAt: Date.now(),
			createdAt: Date.now()
		}
		return application
	})
	return { APPLICATIONS, MIRRORS }
}

export { ReBuild, VALUES }
