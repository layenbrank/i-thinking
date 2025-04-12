export function Singleton() {
    return function (constructor) {
        let instance = null;
        const proxiedConstructor = new Proxy(constructor, {
            construct(target, args) {
                if (!instance) {
                    try {
                        instance = Reflect.construct(target, args);
                    }
                    catch (error) {
                        console.error(`创建 ${constructor.name} 单例时出错:`, error);
                        throw error;
                    }
                }
                return instance;
            }
        });
        return proxiedConstructor;
    };
}
//# sourceMappingURL=singleton.js.map