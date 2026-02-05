import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { ThoughtChain, type ThoughtChainItemType } from '@ant-design/x'
import { clsx } from 'clsx'

import styles from '@/views/intelligence/overlay/thought.module.scss'

export default function Thought() {
  const thoughtChains: ThoughtChainItemType[] = useMemo(function () {
    return [
      {
        title: 'Hello Ant Design X!',
        status: 'success',
        description: 'status: success',
        icon: <CheckCircleOutlined />,
        content:
          'Ant Design X help you build AI chat/platform app as ready-to-use 📦.'
      },
      {
        title: 'Hello World!',
        status: 'success',
        description: 'status: success',
        icon: <CheckCircleOutlined />
      },
      {
        title: 'Pending...',
        status: 'loading',
        description: 'status: pending',
        icon: <LoadingOutlined />
      }
    ]
  }, [])

  return (
    <ThoughtChain
      items={thoughtChains}
      className={clsx([styles.thought, styles.chain])}
    />
  )
}
