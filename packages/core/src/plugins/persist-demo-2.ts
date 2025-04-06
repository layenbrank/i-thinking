// @ts-nocheck
/* eslint-disable */

import type { PiniaPluginContext, StateTree, StoreGeneric } from "pinia";
import Dexie from "dexie";
import { deepOmitUnsafe, deepPickUnsafe } from "deep-pick-omit";
import type { Path } from "deep-pick-omit";
import type { Table } from "dexie";

/**
 * Pinia 持久化存储插件
 * 支持 IndexedDB 和 LocalStorage 两种存储方式
 * 提供数据版本控制、过期控制、数据校验等功能
 * @packageDocumentation
 */

/**
 * 存储错误类，用于统一处理存储相关的错误
 * @class StorageError
 * @extends {Error}
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
    public code?:
      | "DISPOSED"
      | "INIT_FAILED"
      | "VALIDATION_FAILED"
      | "MIGRATION_FAILED",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// 数据表结构
export interface StoreMetadata {
  key: string;
  value: string;
  version: number;
  updatedAt: number;
  integrityHash?: string;
}

/**
 * 存储配置选项接口
 * @interface StorageConfig
 */
export interface StorageConfig {
  /** 数据版本号，用于版本控制和数据迁移 */
  version?: number;
  /** 数据过期时间(毫秒)，默认为 Infinity */
  expirationTime?: number;
  /** 错误处理函数 */
  onError?: (error: StorageError) => void;
  /** 是否启用数据校验，默认为 false */
  verifyIntegrity?: boolean;
}

/**
 * 基础存储接口
 * @interface IStorage
 */
export interface IStorage {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
  remove?(key: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}

// 批量操作接口
export interface IBatchOperations {
  batchSet(items: Record<string, string>): Promise<void>;
  batchGet(keys: string[]): Promise<Record<string, string | null>>;
  batchRemove(keys: string[]): Promise<void>;
}

// 序列化器接口
export interface ISerializer {
  serialize: (value: StateTree) => string;
  deserialize: (value: string) => StateTree;
}

// 持久化选项
export interface PersistOptions<S extends StateTree = StateTree> {
  key?: string;
  storage?: IndexedDBStorage;
  serializer?: ISerializer;
  beforeRestore?: (context: PiniaPluginContext) => void; // 更改 beforeHydrate 为 beforeRestore
  afterRestore?: (context: PiniaPluginContext) => void; // 更改 afterHydrate 为 afterRestore
  onMetadata?: (metadata: StoreMetadata | undefined) => void;
  pick?: Array<Path<S>> | string[];
  omit?: Array<Path<S>> | string[];
  debug?: boolean;
}

// 扩展 Pinia 类型
declare module "pinia" {
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    persist?: boolean | PersistOptions<S> | PersistOptions<S>[];
  }

  export interface PiniaCustomProperties {
    $persist: () => void;
    $hydrate: (opts?: { runHooks?: boolean }) => void;
    $metadata: () => Promise<StoreMetadata | undefined>;
  }
}

// 基础存储类
export abstract class BaseStorage implements IStorage {
  abstract get(key: string): Promise<string | null> | string | null;
  abstract set(key: string, value: string): Promise<void> | void;
}

// LocalStorage 实现
export class LocalStorage extends BaseStorage {
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }
}

export class IndexedDBStorage extends BaseStorage implements IBatchOperations {
  private static dbConnections = new Map<string, Dexie>();
  private static async getConnection(dbName: string): Promise<Dexie> {
    // 复用已存在的连接
    if (IndexedDBStorage.dbConnections.has(dbName)) {
      return IndexedDBStorage.dbConnections.get(dbName)!;
    }

    // 等待其他可能的连接完成
    await Dexie.waitFor(0); // 等待其他事务完成

    const db = new Dexie(dbName);
    IndexedDBStorage.dbConnections.set(dbName, db);
    return db;
  }

  private storageDB: Dexie;
  public storageName: string;
  private dataCache: Map<string, string>;
  private initComplete: Promise<void>;
  private isShutdown = false;
  private storageSettings: Required<StorageConfig>;

  constructor(
    dbName = "piniaStore",
    storageName = "persistedState",
    settings: StorageConfig = {},
  ) {
    super();
    this.storageName = storageName;
    this.storageDB = new Dexie(""); // 临时初始化，会在 initializeStorage 中被替换
    this.dataCache = new Map();
    this.storageSettings = {
      version: settings.version ?? 1,
      expirationTime: settings.expirationTime ?? Infinity,
      onError: settings.onError ?? console.error,
      verifyIntegrity: settings.verifyIntegrity ?? false,
    };

    // 异步初始化数据库连接
    this.initComplete = this.initializeStorage(dbName, settings).catch(
      (error) => {
        this.storageSettings.onError(
          new StorageError(
            "Failed to initialize storage",
            error,
            "INIT_FAILED",
          ),
        );
        return Promise.reject(error);
      },
    );
  }

  private async initializeStorage(
    dbName: string,
    settings: StorageConfig,
  ): Promise<void> {
    try {
      // 获取或创建新的数据库连接
      this.storageDB = await IndexedDBStorage.getConnection(dbName);
      const targetVersion = settings.version ?? 1;

      // 定义表结构
      const schema = {
        [this.storageName]: "key,version,updatedAt",
      };

      // 检查当前数据库版本
      const currentVersion = this.storageDB.verno || 0;

      // 如果数据库已打开且需要升级版本，先关闭它
      if (this.storageDB.isOpen() && targetVersion > currentVersion) {
        this.storageDB.close();
        // 等待其他连接完成
        await Dexie.waitFor(100);
      }

      // 定义版本升级链
      if (targetVersion > currentVersion) {
        // 定义基础版本
        if (currentVersion === 0) {
          this.storageDB.version(1).stores(schema);
        }

        // 定义目标版本
        this.storageDB
          .version(targetVersion)
          .stores(schema)
          .upgrade(async (tx) => {
            try {
              const table = tx.table<StoreMetadata>(this.storageName);
              const items = await table.toArray();

              const updates = items
                .filter((item) => item.version < targetVersion)
                .map((item) => ({
                  ...item,
                  version: targetVersion,
                  updatedAt: Date.now(),
                }));

              if (updates.length > 0) {
                await table.bulkPut(updates);
                console.log(
                  `Migrated ${updates.length} items to version ${targetVersion}`,
                );
              }
            } catch (error) {
              console.error("Version upgrade error:", error);
              throw error;
            }
          });
      }

      // 打开数据库连接
      await this.storageDB.open();

      // 初始化设置
      this.storageSettings = {
        version: targetVersion,
        expirationTime: settings.expirationTime ?? Infinity,
        onError: settings.onError ?? console.error,
        verifyIntegrity: settings.verifyIntegrity ?? false,
      };

      // 初始化缓存
      this.dataCache = new Map();
      await this.initializeCache();
    } catch (error) {
      this.handleError(error, "Storage initialization failed", "INIT_FAILED");
    }
  }

  // 获取表实例
  public getStorageTable(): Table<StoreMetadata> {
    return this.storageDB.table<StoreMetadata>(this.storageName);
  }

  // 计算数据校验和
  private async calculateHash(data: string): Promise<string> {
    if (!this.storageSettings.verifyIntegrity) return "";

    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(data),
    );
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async validateData(item: StoreMetadata): Promise<boolean> {
    try {
      // 验证数据时效性
      if (this.storageSettings.expirationTime !== Infinity) {
        const age = Date.now() - item.updatedAt;
        if (age > this.storageSettings.expirationTime) {
          // 异步删除过期数据
          Promise.resolve().then(() => {
            this.dataCache.delete(item.key);
            this.getStorageTable().delete(item.key);
          });
          return false;
        }
      }

      // 验证数据版本
      if (item.version !== this.storageSettings.version) {
        await this.migrateData(item);
        return false;
      }

      // 验证数据完整性
      if (this.storageSettings.verifyIntegrity && item.integrityHash) {
        const currentHash = await this.calculateHash(item.value);
        if (currentHash !== item.integrityHash) {
          this.storageSettings.onError(
            new StorageError(
              `Data integrity check failed for key: ${item.key}`,
              null,
              "VALIDATION_FAILED",
            ),
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.storageSettings.onError(
        new StorageError("Data validation failed", error, "VALIDATION_FAILED"),
      );
      return false;
    }
  }

  // 修改数据迁移方法
  private async migrateData(item: StoreMetadata): Promise<void> {
    try {
      const currentVersion = this.storageSettings.version;
      if (item.version === currentVersion) return;

      // 如果数据版本高于当前版本,不进行降级
      if (item.version > currentVersion) {
        console.warn(
          `Data version (${item.version}) is higher than current version (${currentVersion}). ` +
            `Skipping migration for key: ${item.key} in table ${this.storageName}`,
        );
        return;
      }

      // 只升级当前表中的数据
      await this.getStorageTable().put({
        ...item,
        version: currentVersion,
        updatedAt: Date.now(),
      });

      console.log(
        `Data migrated for key: ${item.key} in table ${this.storageName} from version ${item.version} to ${currentVersion}`,
      );
    } catch (error) {
      this.handleError(
        error,
        `Failed to migrate data for key: ${item.key} in table ${this.storageName}`,
        "MIGRATION_FAILED",
      );
    }
  }

  // 批量操作实现
  async batchSet(items: Record<string, string>): Promise<void> {
    await this.initComplete;
    if (this.isShutdown)
      throw new StorageError("Storage has been disposed", null, "DISPOSED");

    try {
      // 使用单个事务处理所有操作
      await this.storageDB.transaction(
        "rw",
        this.getStorageTable(),
        async () => {
          const operations = await Promise.all(
            Object.entries(items).map(async ([key, value]) => ({
              key,
              value,
              version: this.storageSettings.version,
              updatedAt: Date.now(),
              integrityHash: await this.calculateHash(value),
            })),
          );

          // 批量更新数据库
          await this.getStorageTable().bulkPut(operations);

          // 批量更新缓存
          operations.forEach((op) => this.dataCache.set(op.key, op.value));
        },
      );
    } catch (error) {
      this.handleError(
        error,
        "Batch set operation failed",
        "VALIDATION_FAILED",
      );
    }
  }

  async batchGet(keys: string[]): Promise<Record<string, string | null>> {
    await this.initComplete;
    if (this.isShutdown) throw new StorageError("Storage has been disposed");

    const result: Record<string, string | null> = {};

    try {
      const items = await this.getStorageTable()
        .where("key")
        .anyOf(keys)
        .toArray();

      for (const key of keys) {
        const item = items.find((i) => i.key === key);
        if (item && (await this.validateData(item))) {
          result[key] = item.value;
          this.dataCache.set(key, item.value);
        } else {
          result[key] = null;
        }
      }
    } catch (error) {
      this.storageSettings.onError(
        new StorageError("Batch get operation failed", error),
      );
    }

    return result;
  }

  async batchRemove(keys: string[]): Promise<void> {
    await this.initComplete;
    if (this.isShutdown) throw new StorageError("Storage has been disposed");

    try {
      await this.getStorageTable().where("key").anyOf(keys).delete();
      keys.forEach((key) => this.dataCache.delete(key));
    } catch (error) {
      this.storageSettings.onError(
        new StorageError("Batch remove operation failed", error),
      );
      throw error;
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      const allItems = await this.getStorageTable().toArray();

      // 并行处理所有数据验证
      const validations = allItems.map(async (item) => {
        if (await this.validateData(item)) {
          this.dataCache.set(item.key, item.value);
        }
      });

      await Promise.all(validations);
    } catch (error) {
      this.storageSettings.onError(
        new StorageError("Failed to init cache", error, "INIT_FAILED"),
      );
    }
  }

  async get(key: string): Promise<string | null> {
    await this.initComplete;

    if (this.isShutdown) throw new StorageError("Storage has been disposed");

    try {
      // 先检查缓存
      const cached = this.dataCache.get(key);
      if (cached) {
        const item = await this.getStorageTable().get(key);
        if (!item || !(await this.validateData(item))) {
          this.dataCache.delete(key);
          return null;
        }
        return cached;
      }

      const item = await this.getStorageTable().get(key);
      if (!item) return null;

      if (await this.validateData(item)) {
        this.dataCache.set(key, item.value);
        return item.value;
      }
      return null;
    } catch (error) {
      this.storageSettings.onError(
        new StorageError(`Failed to get item: ${key}`, error),
      );
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.initComplete;
    if (this.isShutdown) throw new StorageError("Storage has been disposed");

    const oldValue = this.dataCache.get(key);

    try {
      // 确保表存在
      const table = this.getStorageTable();
      if (!table) {
        throw new Error(`Table ${this.storageName} does not exist`);
      }

      const hash = await this.calculateHash(value);
      const record = {
        key,
        value,
        version: this.storageSettings.version,
        updatedAt: Date.now(),
        integrityHash: hash,
      };

      // 先尝试更新数据库
      await table.put(record);
      // 成功后更新缓存
      this.dataCache.set(key, value);
    } catch (error) {
      // 恢复缓存到原始状态
      if (oldValue !== undefined) {
        this.dataCache.set(key, oldValue);
      } else {
        this.dataCache.delete(key);
      }

      this.handleError(
        error,
        `Failed to set item: ${key}`,
        "VALIDATION_FAILED",
      );
    }
  }

  async remove(key: string): Promise<void> {
    await this.initComplete;
    if (this.isShutdown) throw new StorageError("Storage has been disposed");

    const oldValue = this.dataCache.get(key);
    this.dataCache.delete(key);

    try {
      await this.getStorageTable().delete(key);
    } catch (error) {
      this.storageSettings.onError(
        new StorageError(`Failed to remove item: ${key}`, error),
      );
      if (oldValue !== undefined) {
        this.dataCache.set(key, oldValue);
      }
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.isShutdown) return;

    try {
      this.dataCache.clear();
      this.storageDB.close();
      // 移除数据库连接
      IndexedDBStorage.dbConnections.delete(this.storageDB.name);
      this.isShutdown = true;
    } catch (error) {
      this.storageSettings.onError(
        new StorageError("Failed to dispose storage", error),
      );
      throw error;
    }
  }

  private handleError(
    error: unknown,
    message: string,
    code: StorageError["code"],
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new StorageError(`${message}: ${errorMessage}`, error, code);
  }
}

// 默认序列化器
const defaultSerializer: ISerializer = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

// 恢复状态
async function restoreState(
  store: StoreGeneric,
  options: Required<PersistOptions>,
  context: PiniaPluginContext,
  runHooks = true,
) {
  try {
    if (runHooks) options.beforeRestore?.(context);

    const fromStorage = await options.storage?.get(options.key ?? store.$id);
    if (fromStorage) {
      const deserialized = options.serializer?.deserialize(fromStorage);
      const picked = options.pick
        ? deepPickUnsafe(deserialized, options.pick)
        : deserialized;
      const omitted = options.omit
        ? deepOmitUnsafe(picked, options.omit)
        : picked;
      store.$patch(omitted);
    }

    if (runHooks) options.afterRestore?.(context);
  } catch (error) {
    if (options.debug) console.error("[pinia-plugin-persistedstate]", error);
  }
}

// 保存状态
async function saveState(state: StateTree, options: Required<PersistOptions>) {
  try {
    const picked = options.pick ? deepPickUnsafe(state, options.pick) : state;
    const omitted = options.omit
      ? deepOmitUnsafe(picked, options.omit)
      : picked;
    const toStorage =
      options.serializer?.serialize(omitted) ?? JSON.stringify(omitted);
    await options.storage?.set(options.key ?? state.$id, toStorage);
  } catch (error) {
    if (options.debug) console.error("[pinia-plugin-persistedstate]", error);
  }
}

export function createPersistedState(
  globalSettings: Partial<PersistOptions> = {},
) {
  return function (context: PiniaPluginContext) {
    const { store, options } = context;
    if (!options.persist) return;

    const persistRules = Array.isArray(options.persist)
      ? options.persist
      : [typeof options.persist === "boolean" ? {} : options.persist];

    persistRules.forEach((rule) => {
      const storageOptions = {
        key: rule.key ?? store.$id,
        storage:
          rule.storage ?? globalSettings.storage ?? new IndexedDBStorage(),
        serializer:
          rule.serializer ?? globalSettings.serializer ?? defaultSerializer,
        debug: rule.debug ?? globalSettings.debug ?? false,
        onMetadata: rule.onMetadata,
        beforeRestore: rule.beforeRestore,
        afterRestore: rule.afterRestore,
        pick: rule.pick,
        omit: rule.omit,
      } as Required<PersistOptions>;

      store.$hydrate = async ({ runHooks = true } = {}) => {
        await restoreState(store, storageOptions, context, runHooks);
      };

      store.$persist = async () => {
        await saveState(store.$state, storageOptions);
      };

      store.$metadata = async () => {
        const metadata = await storageOptions.storage
          .getStorageTable()
          .toCollection()
          .first();
        return metadata;
      };

      // 初始化时恢复状态
      restoreState(store, storageOptions, context);

      // 监听状态变化
      store.$subscribe(
        async function () {
          await saveState(store.$state, storageOptions);

          const metadata = await storageOptions.storage
            .getStorageTable()
            .toCollection()
            .first();
          storageOptions.onMetadata?.(metadata);
        },
        {
          detached: true,
        },
      );
    });
  };
}
