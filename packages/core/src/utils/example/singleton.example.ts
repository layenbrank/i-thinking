/**
 * 单例模式使用示例
 * @packageDocumentation
 */

import {
  Singleton,
  SingletonProxy,
  SingletonState,
  SingletonError,
  type ErrorHandlingStrategy,
  type ErrorContext,
  type InstanceFactory,
  type Constructor,
  type LifecycleListener,
  type AsyncLifecycleListener,
} from "../singleton";

/**
 * 示例1: 基础配置服务
 * @description 演示最基本的单例使用方式
 */
@Singleton()
class ConfigService {
  private config: Record<string, any> = {};

  setConfig(key: string, value: any): void {
    this.config[key] = value;
  }

  getConfig(key: string): any {
    return this.config[key];
  }
}

/**
 * 示例2: 数据库连接
 * @description 演示带有异步初始化和清理的单例
 */
interface DBConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * 数据库生命周期监听器
 */
class DBLifecycleListener implements LifecycleListener<DatabaseService> {
  onEvent(
    event: "beforeCreate" | "created" | "beforeDestroy" | "destroyed",
    instance: DatabaseService,
  ): void {
    console.log(`[Sync] Database lifecycle event: ${event}`);
  }
}

/**
 * 数据库异步生命周期监听器
 */
class DBAsyncLifecycleListener
  implements AsyncLifecycleListener<DatabaseService>
{
  async onAsyncEvent(
    event: "beforeCreate" | "created" | "beforeDestroy" | "destroyed",
    instance: DatabaseService,
  ): Promise<void> {
    console.log(`[Async] Database lifecycle event: ${event}`);
  }
}

@Singleton({
  lazy: true,
  retryCount: 3,
  retryInterval: 1000,
  lifecycleListener: new DBLifecycleListener(),
  asyncLifecycleListener: new DBAsyncLifecycleListener(),
  onCreate(instance) {
    console.log("Database instance created");
  },
  async onAsyncInit(instance) {
    await instance.connect();
    console.log("Database connected");
  },
  async onDestroy(instance) {
    await instance.disconnect();
    console.log("Database disconnected");
  },
})
class DatabaseService {
  private connection: any = null;
  private config: DBConfig;

  constructor(config: DBConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    console.log(`Connecting to ${this.config.host}:${this.config.port}...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.connection = { connected: true };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      console.log("Disconnecting from database...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.connection = null;
    }
  }

  async query(sql: string): Promise<any> {
    if (!this.connection) {
      throw new Error("Database not connected");
    }
    console.log("Executing query:", sql);
    return { rows: [] };
  }
}

/**
 * 示例3: 全局缓存服务
 * @description 演示全局共享的单例
 */
interface CacheOptions {
  ttl: number;
}

@Singleton({
  global: true,
  onCreate(instance) {
    console.log("Cache service initialized");
  },
})
class CacheService {
  private store = new Map<string, { value: any; expireAt: number }>();
  private readonly defaultTTL: number;

  constructor(options: CacheOptions) {
    this.defaultTTL = options.ttl;
  }

  set(key: string, value: any, ttl?: number): void {
    const expireAt = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, { value, expireAt });
  }

  get(key: string): any {
    const item = this.store.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return item.value;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * 示例4: 自定义错误处理
 * @description 演示如何实现自定义错误处理策略
 */
class CustomErrorStrategy implements ErrorHandlingStrategy {
  handleError(error: Error, context: ErrorContext): void {
    console.error(`Error in ${context.name}:`, error);

    if (context.retryCount < context.maxRetries) {
      console.log(
        `Retrying (${context.retryCount + 1}/${context.maxRetries})...`,
      );
      return;
    }

    throw new Error(
      `Failed after ${context.maxRetries} retries: ${error.message}`,
    );
  }
}

/**
 * 示例5: 自定义实例工厂
 * @description 演示如何实现自定义实例创建逻辑
 */
class CustomInstanceFactory<T> implements InstanceFactory<T> {
  createInstance(constructor: Constructor<T>, args: any[]): T {
    console.log("Creating instance with custom factory...");
    // 这里可以添加前置处理逻辑
    const instance = new constructor(...args);
    // 这里可以添加后置处理逻辑
    return instance;
  }
}

/**
 * 使用示例
 */
export async function example() {
  try {
    // 1. 基础配置服务示例
    console.log("\n=== Basic Config Service Example ===");
    const config1 = new ConfigService();
    const config2 = new ConfigService();
    config1.setConfig("theme", "dark");
    console.log("config2 theme:", config2.getConfig("theme")); // 'dark'
    console.log("Same instance:", config1 === config2); // true

    // 2. 数据库服务示例
    console.log("\n=== Database Service Example ===");
    const db = new DatabaseService({
      host: "localhost",
      port: 5432,
      username: "admin",
      password: "123456",
    });
    // 等待异步初始化完成
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await db.query("SELECT * FROM users");

    // 3. 缓存服务示例
    console.log("\n=== Cache Service Example ===");
    const cache = new CacheService({ ttl: 1000 * 60 }); // 1 minute TTL
    cache.set("user", { id: 1, name: "John" });
    console.log("Cached user:", cache.get("user"));

    // 4. 实例状态管理示例
    console.log("\n=== Instance State Management ===");
    console.log("DB State:", SingletonProxy.getState(DatabaseService));
    console.log("Cache State:", SingletonProxy.getState(CacheService));

    // 5. 错误处理示例
    console.log("\n=== Error Handling Example ===");
    const dbError = SingletonProxy.getError(DatabaseService);
    if (dbError) {
      console.error("DB Error:", dbError.message);
    }

    // 6. 实例销毁示例
    console.log("\n=== Instance Cleanup Example ===");
    await SingletonProxy.destroy(DatabaseService);
    console.log(
      "DB State after destroy:",
      SingletonProxy.getState(DatabaseService),
    );

    // 7. 实例重置示例
    console.log("\n=== Instance Reset Example ===");
    SingletonProxy.reset(CacheService);
    console.log(
      "Cache State after reset:",
      SingletonProxy.getState(CacheService),
    );
  } catch (error) {
    if (error instanceof SingletonError) {
      console.error("Singleton Error:", error.message);
      console.error("Class Name:", error.className);
      if (error.cause) {
        console.error("Cause:", error.cause);
      }
    } else {
      console.error("Error:", error);
    }
  }
}

// 运行示例
// example().catch(console.error)
