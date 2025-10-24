import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/bookmark/overlay.module.scss'

interface Props {
	visible: boolean
	onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
	return (
		<Application.Overlay
			open={props.visible}
			onCancel={() => props.onUpdateVisible(false)}
			onOk={() => props.onUpdateVisible(false)}
		>
			<div className={styles.overlay}>Overlay</div>
		</Application.Overlay>
	)
}

// return (
// 	<Modal
// 		open={props.visible}
// 		destroyOnHidden={true}
// 		maskClosable={true}
// 		closable={false}
// 		footer={null}
// 		title={null}
// 		centered={true}
// 		style={{
// 			transformOrigin: 'center'
// 		}}
// 		className={styles.overlay}
// 		onOk={() => props.onUpdateVisible(false)}
// 		onCancel={() => props.onUpdateVisible(false)}
// 	>
// 		<div className={styles.overlay}>Overlay</div>
// 	</Modal>
// )
