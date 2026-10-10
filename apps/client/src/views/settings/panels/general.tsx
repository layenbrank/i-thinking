import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@i-thinking/design/components/alert-dialog'
import { Button } from '@i-thinking/design/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'
import { Switch } from '@i-thinking/design/components/switch'
import { useState } from 'react'
import { toast } from 'sonner'

import { SettingsRow, SettingsSection } from '@/views/settings/panels/section.tsx'
import { useSessionStore } from '@/stores/session'
import { DETECT_OFF, DETECT_WINDOW, useSettingsStore } from '@/stores/setting'
import { exitApp } from '@/utils/process'
import { checkUpdate } from '@/utils/updater'

const LANGUAGE_OPTIONS = [{ label: '简体中文', value: 'zh-CN' }]

interface ConfirmActionProps {
  label: string
  title: string
  description: string
  confirmLabel: string
  isPending?: boolean
  onConfirm: () => void | Promise<void>
}

/** 危险动作按钮 + 二次确认：调用方只关心文案与回调，弹层细节收在这里 */
function ConfirmAction(props: ConfirmActionProps) {
  const [isOpen, updateOpen] = useState(false)

  return (
    <>
      <Button
        variant="destructive"
        disabled={props.isPending}
        onClick={function () {
          updateOpen(true)
        }}>
        {props.label}
      </Button>
      <AlertDialog
        open={isOpen}
        onOpenChange={updateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{props.title}</AlertDialogTitle>
            <AlertDialogDescription>{props.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={function () {
                updateOpen(false)
                void props.onConfirm()
              }}>
              {props.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function GeneralPanel() {
  const general = useSettingsStore(function (state) {
    return state.settings.general
  })
  const capture = useSettingsStore(function (state) {
    return state.settings.capture
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
    toSignOut()
    toast.success('已退出登录')
  }

  async function onAutostartChange(checked: boolean) {
    try {
      await toUpdate('general', { autostart: checked })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      toast.error(`开机自启设置失败：${text}`)
    }
  }

  async function onDetectChange(checked: boolean) {
    try {
      await toUpdate('capture', { detect: checked ? DETECT_WINDOW : DETECT_OFF })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      toast.error(`窗口检测设置失败：${text}`)
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

  async function onExit() {
    setExiting(true)
    try {
      await exitApp(0)
    } catch (error) {
      setExiting(false)
      const text = error instanceof Error ? error.message : String(error)
      toast.error(`退出失败：${text}`)
    }
  }

  return (
    <div className="flex max-w-full flex-col gap-3 text-sm">
      <SettingsSection title="系统行为">
        <SettingsRow
          label="开机自启"
          hint="开启后登录系统将自动启动，并以托盘形式运行">
          <Switch
            checked={general.autostart}
            onCheckedChange={function (checked) {
              void onAutostartChange(checked)
            }}
          />
        </SettingsRow>

        <SettingsRow
          label="截图窗口检测"
          hint="截图时悬停高亮窗口，单击吸附为选区；关闭后仅自由框选">
          <Switch
            checked={capture.detect === DETECT_WINDOW}
            onCheckedChange={function (checked) {
              void onDetectChange(checked)
            }}
          />
        </SettingsRow>

        <SettingsRow
          label="界面语言"
          hint="多语言即将支持">
          <Select
            items={LANGUAGE_OPTIONS}
            value={general.language}
            disabled>
            <SelectTrigger
              className="w-40"
              aria-label="界面语言">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map(function (option) {
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="账号">
        <div className="flex flex-wrap items-center gap-3 py-2">
          <span className="text-sm text-muted-foreground">
            {user ? `当前：${user.username}` : '未登录'}
          </span>
          {user ? (
            <ConfirmAction
              label="退出登录"
              title="退出登录"
              description="确定要退出当前账号吗？"
              confirmLabel="退出登录"
              onConfirm={onSignOut}
            />
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection title="应用">
        <div className="flex flex-wrap items-center gap-2.5 py-2">
          <Button
            variant="outline"
            disabled={checking}
            onClick={function () {
              void onCheckUpdate()
            }}>
            检查更新
          </Button>
          <ConfirmAction
            label="退出应用"
            title="退出应用"
            description="确定要完全退出 i thinking 吗？（不会保留在托盘）"
            confirmLabel="退出"
            isPending={exiting}
            onConfirm={onExit}
          />
        </div>
      </SettingsSection>
    </div>
  )
}

export default GeneralPanel
