import styles from '@/components/controller/controller.module.scss'
import { Reflection } from '@/components/controller/reflection.tsx'
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
			'navigation'
			// 'clipchamp',
			// 'markdown',
			// 'settings',
			// 'store'
		]

		const [applications, updateApplications] = useState<Application[]>(
			Array.from({ length: components.length }).map(function (_, i) {
				return {
					id: i.toString(),
					width: '60px',
					height: '60px',
					component: components[i],
					// component: components[i % components.length],
					round: '12px',
					size: 'medium',
					slideID: '0',
					sort: 0,
					name: `example-${i}`,
					direction: 'horizontal',
					shape: 'square',
					backgroundColor: '#ffffff4d',
					backgroundImage: null,
					textSize: '13px',
					textColor: '#ffffff',
					description: '书签',
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
