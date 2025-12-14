import styles from '@/components/controller/controller.module.scss'
import { Reflection } from '@/components/controller/reflection.tsx'
import { generateColor } from '@/utils/generate.ts'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'

const Controller = {
	Mirror: function ({ children }: { children: ReactNode }) {
		return <div className={clsx(styles.controller, styles.mirror)}>{children}</div>
	},
	Application: function () {
		const controller = useRef<HTMLDivElement>(null)

		const size = 'mini'
		const shape = 'rectangle'
		const direction = 'horizontal'

		const components: Application.Component[] = [
			'bookmark',
			'calendar',
			'intelligence',
			'navigation',
			'settings',
			'developer',
			'markdown',
			'clipchamp',
			'marketplace',
			'clock',
			'collection',
			'gallery',
			'signboard'
		]

		function matchName(component: Application.Component) {
			if (component === 'bookmark') return '书签'
			if (component === 'calendar') return '日历'
			if (component === 'intelligence') return 'AI'
			if (component === 'navigation') return '导航'
			if (component === 'settings') return '设置'
			if (component === 'developer') return '开发者'
			if (component === 'markdown') return 'Markdown'
			if (component === 'clipchamp') return 'Clipchamp'
			if (component === 'marketplace') return '市场'
			if (component === 'clock') return '时钟'
			if (component === 'collection') return '收藏夹'
			if (component === 'gallery') return '画廊'
			if (component === 'signboard') return '看板'
			return 'unknown'
		}

		const [applications, updateApplications] = useState<Application[]>(
			Array.from({ length: components.length }).map(function (_, i) {
				const title = matchName(components[i])

				return {
					url: null,
					mark: null,
					collectionID: null,
					mirrorID: 'null',
					createdAt: Date.now(),
					updatedAt: Date.now(),
					id: i.toString(),
					component: components[i],
					// component: components[i % components.length],
					round: '12px',
					screenID: '0',
					index: 0,
					title: title,
					backdrop: null,
					background: {
						color: generateColor()
					},
					textSize: '13px',
					textColor: '#ffffff',
					description: title,
					downloadCount: 1000
				}
			})
		)

		useEffect(function () {
			if (!controller.current) return
			console.log('controller', controller.current)

			new Sortable(controller.current, {
				animation: 300,
				sort: true,
				setData(dataTransfer, draggedElement) {
					dataTransfer.setData('text/plain', draggedElement.dataset.id ?? '')
				}
			})

			console.log('applications', applications)
		}, [])

		return (
			<div
				ref={controller}
				className={clsx([
					styles[size],
					styles[shape],
					styles[direction],
					styles.controller,
					styles.application
				])}
			>
				{applications.map(function (value) {
					const Component = Reflection[value.component]
					return (
						<Component {...value} size={size} shape={shape} direction={direction} key={value.id} />
					)
				})}
			</div>
		)
	}
}

export default Controller
