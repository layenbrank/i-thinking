export const useGlobalStore = defineStore('global', function () {
	const count = ref(0)

	const doubleCount = computed(() => count.value * 2)

	function increment() {
		count.value++
	}

	return {
		count,
		doubleCount,
		increment
	}
})
