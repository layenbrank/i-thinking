export type Constructor<T = any> = new (...args: any[]) => T

/**
 * 单例模式装饰器
 * 确保类只有一个实例，并提供全局访问点
 * 使用方式: @Singleton()
 */
export function Singleton() {
	return function <T extends new (...args: any[]) => any>(constructor: T): T {
		// 实例存储
		let instance: InstanceType<T> | null = null

		// 创建代理类
		const proxiedConstructor = new Proxy(constructor, {
			construct(target: T, args: any[]): InstanceType<T> {
				if (!instance) {
					try {
						instance = Reflect.construct(target, args) as InstanceType<T>
					} catch (error) {
						console.error(`创建 ${constructor.name} 单例时出错:`, error)
						throw error
					}
				}

				return instance as InstanceType<T>
			}
		})

		return proxiedConstructor
	}
}
