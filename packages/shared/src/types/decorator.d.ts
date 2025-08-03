type PropertyDecorator = (target: Record<string, any>, propertyKey: string | symbol) => void

type MethodDecorator = <T>(
	target: Record<string, any>,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void

type ParameterDecorator = (
	target: Record<string, any>,
	propertyKey: string | symbol | undefined,
	parameterIndex: number
) => void

type ClassDecorator = <T extends new (...args: unknown[]) => unknown>(target: T) => T | void
