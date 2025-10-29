import styles from '@/components/controller/controller.module.scss'
import { Reflection } from '@/components/controller/reflection.tsx'
import { generateColor } from '@/utils/generate.ts'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'

const Controller = {
	Screen: function ({ children }: { children: ReactNode }) {
		return <div className={clsx(styles.controller, styles.screen)}>{children}</div>
	},
	Application: function () {
		const controller = useRef<HTMLDivElement>(null)

		const components: Application.Component[] = [
			'bookmark',
			'calendar',
			'intelligence',
			'navigation',
			'settings',
			'developer',
			'markdown'
			// 'clipchamp',
			// 'store'
		]

		function matchName(component: Application.Component) {
			if (component === 'bookmark') return '书签'
			if (component === 'calendar') return '日历'
			if (component === 'intelligence') return 'AI'
			if (component === 'navigation') return '导航'
			if (component === 'settings') return '设置'
			if (component === 'developer') return '开发者'
			if (component === 'markdown') return 'Markdown'
			return 'unknown'
		}

		const [applications, updateApplications] = useState<Application[]>(
			Array.from({ length: components.length }).map(function (_, i) {
				const name = matchName(components[i])

				return {
					id: i.toString(),
					width: '60px',
					height: '60px',
					component: components[i],
					// component: components[i % components.length],
					round: '12px',

					// size: 'mini',
					// size: 'small',
					// size: 'medium',
					size: 'large',

					screenID: '0',
					sort: 0,
					name: name,

					direction: 'vertical',
					// direction: 'horizontal',

					// shape: 'square',
					// shape: 'rectangle',
					shape: 'circle',

					// backgroundColor: '#ffffff4d',
					backgroundColor: generateColor(),
					backgroundImage: null,
					textSize: '13px',
					textColor: '#ffffff',
					description: name,
					downloadCount: 1000
				}
			})
		)

		useEffect(function () {
			if (!controller.current) return
			console.log('controller', controller.current)

			console.log('applications', applications)

			const sortable = new Sortable(controller.current, {
				animation: 600,
				dataIdAttr: 'data-id'
			})
		}, [])

		return (
			<div ref={controller} className={clsx(styles.controller, styles.application)}>
				{applications.map(function (value) {
					const Component = Reflection[value.component]
					return <Component {...value} key={value.id} />
				})}
			</div>
		)
	}
}

export default Controller
