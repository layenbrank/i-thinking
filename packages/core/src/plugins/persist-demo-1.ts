// @ts-nocheck
/* eslint-disable */
import Dexie, { type EntityTable } from "dexie";

import type { PiniaPluginContext, StateTree } from "pinia";

import { deepOmitUnsafe, deepPickUnsafe } from "deep-pick-omit";
import type { Path } from "deep-pick-omit";

type Storage = "DexieStorage" | "LocalStorage";

export interface PersistOptions<State extends StateTree = StateTree> {
  version: number;
  key: string;
  storage: Storage;
  serializer?: Serializer;
  beforeHydrate?: (context: PiniaPluginContext) => void;
  afterHydrate?: (context: PiniaPluginContext) => void;
  onMetadata?: (metadata: StoreMetadata | undefined) => void;
  pick?: Array<Path<State>> | Array<string>;
  omit?: Array<Path<State>> | Array<string>;
  debug?: boolean;
}

declare module "pinia" {
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    persist?: boolean | PersistOptions<S> | PersistOptions<S>[];
  }

  export interface PiniaCustomProperties {
    $persist: () => void;
    $hydrate: (opts?: { runHooks?: boolean }) => void;
    $metadata: StoreMetadata | undefined;
    // $store: EntityTable<IStorage, 'key'>
    $store: BaseStorage;
  }
}

export interface Serializer {
  serialize: (value: StateTree) => string;
  deserialize: (value: string) => StateTree;
}

// 存储元数据接口
export interface StoreMetadata {
  key: string;
  value: string;
  version: number;
  updatedAt: number;
  integrityHash?: string;
}

// 存储器接口

interface StorageConfig {
  version: number;
  key: string;
  debug?: boolean;
}

interface Operation {
  key: string;
  value?: string;
}

// 存储操作抽象类
abstract class BaseStorage {
  protected options: StorageConfig;

  constructor(options: StorageConfig) {
    this.options = options;
  }

  abstract add(params: Operation): Promise<void>;
  abstract update(params: Operation): Promise<void>;
  abstract delete(params: Operation): Promise<void>;
  abstract get(params: Operation): Promise<IStorage | null>;

  protected log(operation: string, params: Operation): void {
    if (this.options.debug) {
      console.log(`[Storage ${operation}]`, params);
    }
  }
}

// 测试存储实现
class TestStorage extends BaseStorage {
  async add(params: Operation): Promise<void> {
    this.log("add", params);
  }

  async update(params: Operation): Promise<void> {
    this.log("update", params);
  }

  async delete(params: Operation): Promise<void> {
    this.log("delete", params);
  }

  async get(params: Operation): Promise<IStorage | null> {
    this.log("get", params);
    return null;
  }
}

export class LocalStorage extends BaseStorage {
  async add(params: Operation): Promise<void> {
    localStorage.setItem(params.key, params.value ?? "");

    this.log("add", params);
  }

  async update(params: Operation): Promise<void> {
    localStorage.setItem(params.key, params.value ?? "");

    this.log("update", params);
  }

  async delete(params: Operation): Promise<void> {
    localStorage.removeItem(params.key);
    this.log("delete", params);
  }

  async get(params: Operation): Promise<IStorage | null> {
    const item = localStorage.getItem(params.key) as IStorage | null;
    this.log("get", params);
    return item;
  }
}

interface IStorage {
  key: string;
  value: string;
  version: number;
  updatedAt: number;
  integrityHash: string;
}

export class DexieStorage extends BaseStorage {
  private storage: Dexie & {
    store: EntityTable<IStorage, "key">;
  };

  constructor(options: StorageConfig) {
    super(options);
    this.storage = new Dexie(options.key) as Dexie & {
      store: EntityTable<
        IStorage,
        "key" // primary key "key" (for the typings only)
      >;
    };
    this.storage.version(options.version).stores({
      store: "key,value,version,updatedAt,integrityHash",
    });
  }

  async add(params: Operation): Promise<void> {
    this.log("add", params);
    await this.storage.store.add({
      key: params.key,
      value: params.value,
      version: this.options.version,
      integrityHash: "",
      updatedAt: Date.now(),
    });
  }

  async update(params: Operation): Promise<void> {
    this.log("update", params);
    await this.storage.store.put({
      key: params.key,
      value: params.value,
      version: this.options.version,
      integrityHash: "",
      updatedAt: Date.now(),
    });
  }

  async delete(params: Operation): Promise<void> {
    this.log("delete", params);
    await this.storage.store.delete(params.key);
  }

  async get(params: Operation): Promise<IStorage | null> {
    this.log("get", params);
    const item = await this.storage.store.get(params.key);
    return item ?? null;
  }
}

// 创建持久化插件
export function createPersistedState(config: Partial<PersistOptions>) {
  const storageMap: Record<string, BaseStorage> = {
    localStorage: new LocalStorage({
      version: config.version!,
      key: config.key!,
      debug: config.debug,
    }),
    dexie: new DexieStorage({
      version: config.version!,
      key: config.key!,
      debug: config.debug,
    }),
  };

  const storage: BaseStorage = storageMap[config.storage!];
  const version = config.version! ?? 1;

  // return ({ store, options: piniaOptions }: PiniaPluginContext) => {
  return function (context: PiniaPluginContext) {
    const { store, options } = context;
    if (!options.persist) return;
    options.persist;
    const persistRules = Array.isArray(options.persist)
      ? options.persist
      : [typeof options.persist === "boolean" ? {} : options.persist];

    store.$store = storage;

    persistRules.forEach((rule) => {
      rule;
    });

    const storeKey = options.key ?? store.$id;
    let currentMetadata: StoreMetadata | undefined;

    // 添加 $metadata 方法到 store
    store.$metadata = currentMetadata;

    // 计算数据完整性哈希
    const calculateHash = (value: string): string => {
      // 这里可以实现自己的哈希算法
      return btoa(encodeURIComponent(value));
    };

    // 恢复状态
    const restoreState = async () => {
      try {
        const metadata = await storage.get({
          key: storeKey,
        });
        if (metadata) {
          options.beforeHydrate?.(context);

          const deserialized = options.serializer?.deserialize(metadata.value);
          const picked = options.pick
            ? deepPickUnsafe(deserialized ?? {}, options.pick)
            : deserialized;
          const omitted = options.omit
            ? deepOmitUnsafe(picked ?? {}, options.omit)
            : picked;
          store.$patch(omitted ?? {});

          currentMetadata = metadata;

          options.onMetadata?.(metadata);

          if (metadata.version === version) {
            const savedState = JSON.parse(metadata.value);
            if (options.pick) {
              const partialState: StateTree = {};
              options.pick.forEach((path) => {
                if (savedState[path] !== undefined) {
                  partialState[path] = savedState[path];
                }
              });
              store.$patch(partialState);
            } else {
              store.$patch(savedState);
            }
          }
          options.afterHydrate?.(context);
        }
      } catch (err) {
        console.error("Error restoring state:", err);
      }
    };

    // 保存状态
    const saveState = async () => {
      try {
        const stateToPersist = options.pick
          ? options.pick.reduce((acc, path) => {
              acc[path] = store.$state[path];
              return acc;
            }, {} as StateTree)
          : store.$state;

        const value = JSON.stringify(stateToPersist);
        const metadata: StoreMetadata = {
          key: storeKey,
          value,
          version,
          updatedAt: Date.now(),
          integrityHash: calculateHash(value),
        };

        await storage.add({
          key: storeKey,
          value,
        });
        options.onMetadata?.(metadata);
      } catch (err) {
        console.error("Error saving state:", err);
      }
    };

    // 订阅状态变化
    store.$subscribe(
      (_, state) => {
        saveState();
      },
      { detached: true },
    );

    // 初始化时恢复状态
    restoreState();
  };
}

// export default function piniaPluginPersistedstate(context: PiniaPluginContext): ReturnType<PiniaPlugin> {
// 	createPersistedState()(context)
// }
