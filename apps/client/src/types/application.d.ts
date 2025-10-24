import type { ClassValue } from 'clsx'
import type { JSX } from 'react'

declare global {
	namespace Application {
		// interface ComponentProps extends Partial<Application> {
		// draggable: boolean
		// className: ClassValue
		// }

		type Reflection = Record<Component, (props: ComponentProps) => JSX.Element>
	}
}
