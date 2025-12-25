import Application from '@/features/application/application.tsx'
import styles from '@/features/applications/calendar/overlay.module.scss'
import clsx from 'clsx'
import { Calendar } from 'antd'

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
      <Calendar
        styles={{
          content: {
            height: '100%'
          }
        }}
        classNames={{
          body: clsx([styles.calendar, styles.body]),
          content: clsx([styles.calendar, styles.content]),
          header: clsx([styles.calendar, styles.header]),
          item: clsx([styles.calendar, styles.item]),
          root: clsx([styles.calendar, styles.root])
        }}></Calendar>
      {/* <div className={styles.overlay}>Overlay</div> */}
    </Application.Overlay>
  )
}
