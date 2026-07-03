import { Empty, Typography } from 'antd'

import styles from '@/features/applications/settings/panels/general.module.scss'

function GeneralPanel() {
  return (
    <div className={styles.panel}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="通用设置即将推出"
      />
      <Typography.Text
        type="secondary"
        className={styles.hint}>
        未来将支持：开机自启、界面语言等基础偏好配置
      </Typography.Text>
    </div>
  )
}

export default GeneralPanel
