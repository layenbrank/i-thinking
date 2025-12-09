import type { CSSProperties } from 'vue'

function useApplication(application: Application) {
	const style = computed(function (): CSSProperties {
		const round = application.round
		const size = application.background?.size
		const clip = application.background?.clip
		const color = application.background?.color
		const image = application.background?.image
		const origin = application.background?.origin
		const repeat = application.background?.repeat
		const position = application.background?.position
		const blendMode = application.background?.blendMode
		const attachment = application.background?.attachment

		const backgroundImage = image ? `url(${image})` : undefined
		const backgroundColor = image ? undefined : (color ?? '#ffffff')

		const design: CSSProperties = {
			'background-size': size ?? 'cover',
			'background-color': backgroundColor,
			'background-image': backgroundImage,
			'--application-round': round ?? undefined,
			'background-repeat': repeat ?? 'no-repeat',
			'background-position': position ?? 'center',
			'background-attachment': attachment ?? 'fixed'
		}

		if (clip) design.backgroundClip = clip
		if (origin) design.backgroundOrigin = origin
		if (blendMode) design.backgroundBlendMode = blendMode

		return design
	})

	return { style }
}

export { useApplication }
