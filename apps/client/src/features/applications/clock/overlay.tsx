import Application from '@/features/application/application.tsx'
import styles from '@/features/applications/clock/overlay.module.scss'

interface Props {
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
  return (
    <Application.Overlay
      open={props.visible}
      onCancel={() => props.onUpdateVisible(false)}
      onOk={() => props.onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </Application.Overlay>
  )
}
