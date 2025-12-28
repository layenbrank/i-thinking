import { Application } from '@/features/application/application.tsx'
import styles from '@/features/applications/navigation/overlay.module.scss'

interface Props {
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
  useEffect(function () {}, [])
  return (
    <Application.Overlay
      open={props.visible}
      onCancel={() => props.onUpdateVisible(false)}
      onOk={() => props.onUpdateVisible(false)}>
      <iframe
        // src="https://cn.bing.com"
        src="https://www.baidu.com"
        allow="autoplay; encrypted-media"
        allowFullScreen
        width="100%"
        height="100%"
        seamless={true}></iframe>
      {/* <div className={styles.overlay}>Overlay</div> */}
    </Application.Overlay>
  )
}
