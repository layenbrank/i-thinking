import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/collection/collection.module.scss'
import Marker from '@/components/applications/collection/marker.tsx'
import Overlay from '@/components/applications/collection/overlay.tsx'
import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { useState } from 'react'

export default function Collection(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	// 创建放置区域
	const { setNodeRef, isOver } = useDroppable({
		id: 'collection-drop-zone'
	})

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application
			onTrash={onTrash}
			{...props}
			droppableRef={setNodeRef}
			className={clsx(styles.collection, {
				[styles['drop-over']]: isOver
			})}
		>
			<Marker
				size={props.size}
				direction={props.direction}
				shape={props.shape}
				onDoubleClick={() => onUpdateVisible(true)}
			/>
			{visible && <Overlay visible={visible} onUpdateVisible={onUpdateVisible} />}
		</Application>
	)
}
