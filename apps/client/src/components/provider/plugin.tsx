interface Plugin {
  unique: string
  version: string
  mount: () => void
  unmount: () => void
}

interface PluginProviderProps {
  children: React.ReactNode
  plugins?: Plugin[]
}

function PluginProvider(props: PluginProviderProps) {
  useEffect(
    function () {
      if (!Array.isArray(props.plugins)) return
      props.plugins.forEach(function (plugin) {
        try {
          plugin?.mount?.()
        } catch (error) {
          console.error('Error mounting plugin:', error)
        }
      })

      return function () {
        if (!Array.isArray(props.plugins)) return
        props.plugins.forEach(function (plugin) {
          try {
            plugin?.unmount?.()
          } catch (error) {
            console.error('Error unmounting plugin:', error)
          }
        })
      }
    },
    [props.plugins]
  )

  return <>{props.children}</>
}

export { PluginProvider, type Plugin, type PluginProviderProps }
