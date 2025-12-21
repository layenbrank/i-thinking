import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { useState } from 'react'

import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/collection/collection.module.scss'
import Marker from '@/components/applications/collection/marker.tsx'
import Overlay from '@/components/applications/collection/overlay.tsx'

export default function Collection(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application
			{...props}
			onTrash={onTrash}
			className={clsx(styles.collection)}>
			<Marker
				size={props.size}
				shape={props.shape}
				direction={props.direction}
				onDoubleClick={() => onUpdateVisible(true)}
			/>
			<Overlay
				id={props.id}
				visible={visible}
				onUpdateVisible={onUpdateVisible}
			/>
		</Application>
	)
}
