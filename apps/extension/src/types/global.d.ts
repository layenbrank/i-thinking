export type ClassDecorator = <TFunction extends () => void>(target: TFunction) => TFunction | void

export type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void

export type MethodDecorator = <T>(
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void

export type ParameterDecorator = (
  target: Object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number
) => void

export type ClassConstructor = new (...args: any[]) => any
