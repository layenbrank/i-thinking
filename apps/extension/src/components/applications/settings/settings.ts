import { useApplicationStore } from '@/stores/application.ts'

const applicationStore = useApplicationStore()

function useSettings() {
	const active = ref<Application | null>(null)

	function updateActive(event: MouseEvent) {
		const target = event.target as HTMLElement

		const closest = target.closest<HTMLElement>('.application')
		if (!closest) return

		const id = closest.dataset.id
		if (!id) return

		const application = applicationStore.applications?.find(function (value) {
			return value.id === id
		})
		if (!application) return
		active.value = application
	}

	function updateSetting<T extends keyof Application>(key: T, value: Application[T]) {
		if (!active.value) return
		active.value[key] = value
		void applicationStore.toUpdate(active.value.id, { [key]: value })
	}

	watchEffect(function () {
		if (!applicationStore.applications) return
		const [application] = applicationStore.applications
		if (!application) return
		if (active.value) return
		active.value = application
	})

	return {
		active,
		updateActive,
		updateSetting
	}
}

const scope = effectScope(true)
const store = scope.run(useSettings)

function useStore() {
	if (!store) throw new Error('Settings Store is not initialized')
	return { ...store, dispose: () => scope.stop() }
}

export { useStore }
