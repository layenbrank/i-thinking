export function isAndroid(): boolean {
	return navigator.platform === 'Android' || /android/i.test(navigator.userAgent)
}

export function isiOS(): boolean {
	return (
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
			navigator.platform
		) ||
		// iPad on iOS 13 detection
		(navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	)
}

export function isMacOS(): boolean {
	return typeof navigator !== 'undefined' ? navigator.platform.includes('Mac') : false
}
