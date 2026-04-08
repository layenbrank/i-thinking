import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

import { uniqWith } from 'lodash-es'

// ─── Types ───────────────────────────────────────────────

type PluginStatus = 'mounted' | 'error'

interface Plugin {
  unique: string
  mount: () => void
  unmount: () => void
  /** 优先级越高越先挂载，默认 0 */
  priority?: number
  /** 设为 false 可跳过挂载，默认 true */
  enabled?: boolean
}

interface PluginState {
  plugin: Plugin
  status: PluginStatus
  error?: unknown
}

interface PluginProviderProps {
  children: React.ReactNode
  plugins?: Plugin[]
  /** 插件挂载/卸载出错时的统一回调（可用于上报监控） */
  onError?: (plugin: Plugin, error: unknown) => void
}

// ─── Context ─────────────────────────────────────────────

interface PluginContextValue {
  getter: (unique: string) => PluginState | undefined
}

const PluginContext = createContext<PluginContextValue>({
  getter: () => undefined
})

function usePluginContext() {
  return useContext(PluginContext)
}

// ─── Provider ────────────────────────────────────────────

function PluginProvider(props: PluginProviderProps) {
  const { children, plugins: rawPlugins, onError } = props
  const registryRef = useRef(new Map<string, PluginState>())

  // 去重 → 过滤 enabled → 按 priority 降序
  const plugins = useMemo(
    function () {
      if (!Array.isArray(rawPlugins)) return []
      return uniqWith(rawPlugins, (a, b) => a.unique === b.unique)
        .filter((p) => p.enabled !== false)
        .toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    },
    [rawPlugins]
  )

  useEffect(
    function () {
      const registry = registryRef.current
      const nextKeys = new Set(plugins.map((p) => p.unique))

      // Phase 1: 卸载已移除的插件
      for (const [key, state] of registry) {
        if (!nextKeys.has(key)) {
          try {
            state.plugin.unmount()
          } catch (error) {
            console.error(`[PluginProvider] unmount error "${key}":`, error)
          }
          registry.delete(key)
        }
      }

      // Phase 2: 挂载新增的插件（按 priority 顺序）
      for (const plugin of plugins) {
        if (registry.has(plugin.unique)) continue
        try {
          plugin.mount()
          registry.set(plugin.unique, { plugin, status: 'mounted' })
        } catch (error) {
          registry.set(plugin.unique, { plugin, status: 'error', error })
          console.error(`[PluginProvider] mount error "${plugin.unique}":`, error)
          onError?.(plugin, error)
        }
      }

      // Cleanup: 组件卸载时反向卸载全部插件
      return function () {
        const entries = [...registry.entries()].reverse()
        for (const [key, state] of entries) {
          try {
            state.plugin.unmount()
          } catch (error) {
            console.error(`[PluginProvider] unmount error "${key}":`, error)
          }
        }
        registry.clear()
      }
    },
    [plugins, onError]
  )

  const contextValue = useMemo<PluginContextValue>(function () {
    return {
      getter(unique: string) {
        return registryRef.current.get(unique)
      }
    }
  }, [])

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>
}

export { PluginProvider, usePluginContext, type Plugin, type PluginProviderProps, type PluginState }
