/**
 * Overview 壳层：搜索 / Mirror 舞台 / 胶囊浮层 / 登录入口
 * 同时承担主窗口的全局初始化职责（数据加载、插件注册、corex 就绪检测）
 */
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { attachConsole } from '@tauri-apps/plugin-log'
import { Layout as Payload } from 'antd'
import { App as AntApp } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'

import ReSignIn from '@/features/signin/signin.tsx'
import Controller from '@/features/controller/controller.tsx'
import { PluginProvider, type Plugin } from '@/components/provider/plugin.tsx'
import { EngineSearch } from '@/views/overview/engine/engine-search'
import { OverviewCapsule } from '@/views/overview/overview-capsule'
import styles from '@/views/overview/overview.module.scss'
import { IntelligencePlugin } from '@/plugins/intelligence.ts'
import { StoragePlugin } from '@/plugins/storage.ts'
import { useMirrorStore } from '@/stores/mirror.ts'
import { useSettingsStore } from '@/stores/setting.ts'
import { applyCliMatches } from '@/utils/cli'
import { checkUpdate } from '@/utils/updater'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

const plugins: Plugin[] = [
  {
    ...StoragePlugin,
    priority: 10
  },
  IntelligencePlugin
]
const SCREENSHOT_SHORTCUT = 'Alt+Q'
const COREX_NOT_READY = 'corex 未就绪，PDF / 截图等功能暂不可用。请构建 corex-daemon 后重启应用。'

export default function Overview() {
  const [signinOpen, setSigninOpen] = useState(false)

  // 主窗口数据初始化：mirror + settings；overlay 仅在有内容时由 toInitialize 显示
  useEffect(function () {
    async function bootstrap() {
      await useMirrorStore.getState().toInitialize()
      await useSettingsStore.getState().toInitialize()
    }
    void bootstrap()
  }, [])

  // DEV 模式控制台日志
  useEffect(function () {
    if (!import.meta.env.DEV) return

    let detach: (() => void) | undefined
    let cancelled = false

    async function attach() {
      try {
        const detachConsole = await attachConsole()
        if (cancelled) detachConsole()
        else detach = detachConsole
      } catch (err) {
        console.warn('[Overview] attachConsole failed', err)
      }
    }

    void attach()
    return function () {
      cancelled = true
      detach?.()
    }
  }, [])

  // CLI 参数处理
  useEffect(function () {
    void applyCliMatches()
  }, [])

  // 托盘事件监听
  useEffect(function () {
    let unlisten: (() => void) | undefined
    let cancelled = false

    async function bootstrap() {
      try {
        unlisten = await listen<string>('tray:action', function (event) {
          if (event.payload === 'check-update') void checkUpdate()
        })
        if (cancelled) unlisten()
      } catch (err) {
        console.warn('[Overview] tray:action listen failed', err)
      }
    }

    void bootstrap()
    return function () {
      cancelled = true
      unlisten?.()
    }
  }, [])

  // 截图全局快捷键
  useEffect(function () {
    let cleanup: (() => void) | null = null
    let cancelled = false

    async function bootstrap() {
      try {
        if (await isRegistered(SCREENSHOT_SHORTCUT)) await unregister(SCREENSHOT_SHORTCUT)
        await register(SCREENSHOT_SHORTCUT, function (event) {
          if (event.state === 'Pressed') void invoke('capture:open')
        })
        if (cancelled) await unregister(SCREENSHOT_SHORTCUT)
        else {
          cleanup = function () {
            void unregister(SCREENSHOT_SHORTCUT)
          }
        }
      } catch (err) {
        console.warn('[Overview] 注册截图快捷键失败', err)
      }
    }

    void bootstrap()

    return function () {
      cancelled = true
      cleanup?.()
    }
  }, [])

  function onPluginError(plugin: Plugin, error: unknown) {
    console.error(`plugin error "${plugin.unique}"`, error)
  }

  return (
    <Payload className={clsx(styles.overview, styles.payload)}>
      <PluginProvider
        plugins={plugins}
        onError={onPluginError}>
        <CorexReadyGate />
        <Prefix className={clsx(styles.overview, styles.prefix)}>
          <EngineSearch />
        </Prefix>
        <Core className={clsx(styles.overview, styles.core)}>
          <Controller.Mirror>
            <Controller.MagneticTile />
          </Controller.Mirror>
        </Core>
        <Suffix className={clsx(styles.overview, styles.suffix)}></Suffix>
        <OverviewCapsule
          onSignIn={function () {
            setSigninOpen(true)
          }}
        />
        <ReSignIn
          open={signinOpen}
          onClose={function () {
            setSigninOpen(false)
          }}
        />
      </PluginProvider>
    </Payload>
  )
}

/** 必须挂在 AntApp 内，才能走动态 message 上下文 */
function CorexReadyGate() {
  const { message } = AntApp.useApp()

  useEffect(
    function () {
      let unlisten: (() => void) | undefined
      let disposed = false
      let warned = false

      function warn() {
        if (disposed || warned) return
        warned = true
        message.warning(COREX_NOT_READY, 8)
      }

      async function bootstrap() {
        try {
          unlisten = await listen('corex://not-ready', warn)
          const ready = await invoke<boolean | null>('ipc:ready')
          if (ready === false) warn()
        } catch (err) {
          console.warn('[Overview] corex 状态检查失败', err)
        }
      }

      void bootstrap()

      return function () {
        disposed = true
        unlisten?.()
      }
    },
    [message]
  )

  return null
}
