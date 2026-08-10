import { Button, Modal, Select, Space, Switch, Typography, message } from 'antd'
import { useState } from 'react'

import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/setting'
import { exitApp } from '@/utils/process'
import { checkUpdate } from '@/utils/updater'

import styles from '@/features/magnetic-tiles/settings/panels/general.module.scss'

const LANGUAGE_OPTIONS = [{ label: '简体中文', value: 'zh-CN' }]

function GeneralPanel() {
  const general = useSettingsStore(function (state) {
    return state.settings.general
  })
  const toUpdate = useSettingsStore(function (state) {
    return state.toUpdate
  })
  const user = useSessionStore(function (state) {
    return state.user
  })
  const toSignOut = useSessionStore(function (state) {
    return state.toSignOut
  })
  const [checking, setChecking] = useState(false)
  const [exiting, setExiting] = useState(false)

  function onSignOut() {
    Modal.confirm({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      okText: '退出登录',
      okType: 'danger',
      cancelText: '取消',
      onOk: function () {
        toSignOut()
        message.success('已退出登录')
      }
    })
  }

  async function onAutostartChange(checked: boolean) {
    try {
      await toUpdate('general', { autostart: checked })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      message.error(`开机自启设置失败：${text}`)
    }
  }

  async function onCheckUpdate() {
    setChecking(true)
    try {
      await checkUpdate()
    } finally {
      setChecking(false)
    }
  }

  function onExit() {
    Modal.confirm({
      title: '退出应用',
      content: '确定要完全退出 i thinking 吗？（不会保留在托盘）',
      okText: '退出',
      okType: 'danger',
      cancelText: '取消',
      onOk: async function () {
        setExiting(true)
        try {
          await exitApp(0)
        } catch (error) {
          setExiting(false)
          const text = error instanceof Error ? error.message : String(error)
          message.error(`退出失败：${text}`)
        }
      }
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <Typography.Text className={styles.cardTitle}>系统行为</Typography.Text>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>开机自启</span>
          <div className={styles.fieldControl}>
            <Switch
              checked={general.autostart}
              onChange={onAutostartChange}
            />
            <Typography.Text
              type="secondary"
              className={styles.hint}>
              开启后登录系统将自动启动，并以托盘形式运行
            </Typography.Text>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>界面语言</span>
          <div className={styles.fieldControl}>
            <Select
              disabled
              value={general.language}
              options={LANGUAGE_OPTIONS}
              style={{ minWidth: 160 }}
            />
            <Typography.Text
              type="secondary"
              className={styles.hint}>
              多语言即将支持
            </Typography.Text>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <Typography.Text className={styles.cardTitle}>账号</Typography.Text>
        <Space wrap>
          {user ? (
            <>
              <Typography.Text type="secondary">当前：{user.username}</Typography.Text>
              <Button
                danger
                onClick={onSignOut}>
                退出登录
              </Button>
            </>
          ) : (
            <Typography.Text type="secondary">未登录</Typography.Text>
          )}
        </Space>
      </div>

      <div className={styles.card}>
        <Typography.Text className={styles.cardTitle}>应用</Typography.Text>
        <Space wrap>
          <Button
            loading={checking}
            onClick={onCheckUpdate}>
            检查更新
          </Button>
          <Button
            danger
            loading={exiting}
            onClick={onExit}>
            退出应用
          </Button>
        </Space>
      </div>
    </div>
  )
}

export default GeneralPanel
