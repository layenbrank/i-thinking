import { Reflect } from '@/components/app-controller/reflect.tsx'
import { useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'
import styles from './app-controller.module.scss'

export default function AppController() {
	const controller = useRef<HTMLDivElement>(null)
	const components: Application.Component[] = [
		'app-bookmark',
		'app-calendar',
		'app-clipchamp',
		'app-intelligence',
		'app-markdown',
		'app-navigation',
		'app-settings',
		'app-store'
	]

	const [applications, updateApplications] = useState<Application[]>(
		Array.from({ length: 10 }).map(function (_, i) {
			return {
				id: i.toString(),
				width: '60px',
				height: '60px',
				component: components[i % components.length],
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

		const sortable = new Sortable(controller.current, {
			animation: 600,
			dataIdAttr: 'data-id'
		})
	}, [])

	return (
		<div ref={controller} className={styles['app-controller']}>
			{applications.map(function (struct) {
				const Application = Reflect[struct.component]({
					draggable: true,
					...struct
				})
				return <Application key={struct.id} />
			})}
		</div>
	)
}
