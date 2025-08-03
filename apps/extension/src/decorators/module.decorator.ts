export const MODULE_METADATA = {
	IMPORTS: 'imports',
	PROVIDERS: 'providers',
	CONTROLLERS: 'controllers',
	EXPORTS: 'exports'
}

const metadataKeys = [
	MODULE_METADATA.IMPORTS,
	MODULE_METADATA.EXPORTS,
	MODULE_METADATA.CONTROLLERS,
	MODULE_METADATA.PROVIDERS
]

export function validateModuleKeys(keys: string[]) {
	const validateKey = (key: string) => {
		if (metadataKeys.includes(key)) {
			return
		}
		throw new Error(INVALID_MODULE_CONFIG_MESSAGE`${key}`)
	}
	keys.forEach(validateKey)
}

export function INVALID_MODULE_CONFIG_MESSAGE(text: TemplateStringsArray, property: string) {
	return `Invalid property '${property}' passed into the @Module() decorator.`
}

export function Module(metadata: any) {
	const propsKeys = Object.keys(metadata)
	validateModuleKeys(propsKeys)

	return function (target: Constructor) {
		for (const property in metadata) {
			if (Object.hasOwnProperty.call(metadata, property)) {
				// console.log('property', property)
				// console.log((metadata as any)[property])
				console.log('target', target)

				Reflect.defineMetadata(property, (metadata as any)[property], target)
			}
		}
	}
}
