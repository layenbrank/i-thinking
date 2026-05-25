import Controller from '@/features/controller/controller.tsx'
import styles from '@/views/overview/overview.module.scss'
import { Input, Layout as Payload } from 'antd'
import { clsx } from 'clsx'
// import { MarkdownRepo } from '@/databases/markdown.repo'
// import { useMirrorStore } from '@/stores/mirror.ts'
// import { useApplications } from '@/stores/mirror'
// import { webview} from '@tauri-apps/api'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
  return (
    <Payload className={clsx(styles.overview, styles.payload)}>
      <Prefix className={clsx(styles.overview, styles.prefix)}>
        <Input className={clsx(['bg-transparent border-transparent'])}></Input>
      </Prefix>
      <Core className={clsx(styles.overview, styles.core)}>
        <Controller.Mirror>
          <Controller.Application />
        </Controller.Mirror>
      </Core>
      <Suffix className={clsx(styles.overview, styles.suffix)}>footer</Suffix>
    </Payload>
  )
}
