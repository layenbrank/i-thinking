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
	useEffect(function () {
		props.plugins?.forEach(function (plugin) {
			plugin.mount()
		})

		return function () {
			props.plugins?.forEach(function (plugin) {
				plugin.unmount()
			})
		}
	}, [])

	return <>{props.children}</>
}

export { PluginProvider, type Plugin, type PluginProviderProps }
