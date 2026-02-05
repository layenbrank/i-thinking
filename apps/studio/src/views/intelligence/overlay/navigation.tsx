import {
  AppstoreAddOutlined,
  FieldTimeOutlined,
  GithubOutlined
} from '@ant-design/icons'
import {
  Conversations,
  type ConversationItemType,
  type ConversationsProps
} from '@ant-design/x'
import { Flex, theme } from 'antd'
import { clsx } from 'clsx'
import { v4 as UUIDV4 } from 'uuid'

import { timeSphere } from '@i-thinking/utils'

import {
  session$,
  useIntelligenceStore as store
} from '@/stores/intelligence.ts'

import styles from '@/views/intelligence/overlay/navigation.module.scss'

type AiSession = Application.Intelligence.AiSession
type AiMessage = Application.Intelligence.AiMessage
type CommunicateMessage = Application.Intelligence.Communicate.Message

const groupName = ['今天', '昨天', '历史']

export default function Navigation() {
  const { token } = theme.useToken()
  const sessions = store((state) => state.sessions)
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['今天'])
  const conversations: ConversationItemType[] = useMemo(
    function () {
      return sessions.map(function (session, index) {
        return {
          key: session.id,
          label: session.title,
          group: timeSphere.isToday(session.updatedAt)
            ? '今天'
            : timeSphere.isYesterday(session.updatedAt)
              ? '昨天'
              : '历史',
          icon: <GithubOutlined />,
          updatedAt: session.updatedAt
        }
      })
      // .toSorted(function (a, b) {
      //   return b.updatedAt - a.updatedAt
      // })
    },
    [sessions]
  )

  const groupable: ConversationsProps['groupable'] = useMemo(
    function () {
      return {
        label: (group) => {
          return (
            <Flex gap="small">
              <FieldTimeOutlined />
              {group}
            </Flex>
          )
        },
        collapsible(group) {
          return groupName.includes(group)
        },
        expandedKeys: expandedKeys,
        onExpand: setExpandedKeys
      }
    },
    [expandedKeys]
  )

  function handleActiveKey(key: string) {
    void store.getState().toReadSession(key)
  }

  async function handleInsertSession() {
    const sessionID = UUIDV4()
    const session: AiSession = {
      id: sessionID,
      title: '新对话' + (sessions.length + 1),
      pinned: false,
      collectionID: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
      // updatedAt: timeSphere.decrement(Date.now(), 2, 'day').valueOf()
    }
    await store.getState().toInsertSession([session])
    void store.getState().toReadSession(sessionID)
  }

  return (
    <Conversations
      creation={{
        label: '开启新对话',
        align: 'start',
        onClick: handleInsertSession,
        icon: <AppstoreAddOutlined />
      }}
      activeKey={session$.value?.id}
      items={conversations}
      defaultActiveKey={session$.value?.id}
      onActiveChange={handleActiveKey}
      style={{
        '--background-color': token.colorBgContainer,
        '--radius': `${token.borderRadius}px`
      }}
      groupable={groupable}
      className={clsx(styles.section, styles.conversations)}
    />
  )
}
