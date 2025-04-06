// @ts-nocheck
/* eslint-disable */
import Dexie, { type EntityTable } from "dexie";
import type {
  PiniaPlugin,
  PiniaPluginContext,
  StateTree,
  StoreGeneric,
} from "pinia";
import { deepOmitUnsafe, deepPickUnsafe, type Path } from "deep-pick-omit";

declare module "pinia" {
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    persist?: PersistOptions<S>[];
  }

  export interface PiniaCustomProperties {
    $persist: () => void;
    $hydrate: (opts?: { runHooks?: boolean }) => void;
    $metadata: StoreMetadata | undefined;
    $store: {
      options: StorageConfig;
      get: (params: Operation) => Promise<StoreMetadata | null>;
      set: (params: Operation) => Promise<string | void>;
      log: (type: keyof Console, ...args: any[]) => void;
    };
  }
}

type Storage = "DexieStorage" | "LocalStorage";

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

type StorageConfig = Omit<PersistOptions, "storage">;

// interface StorageConfig {
//   version: number
//   key: string
//   debug?: boolean
// }

interface Operation {
  key: string;
  value?: string;
}

// 存储操作抽象类
abstract class BaseStorage {
  // protected options: StorageConfig
  public options: StorageConfig;

  constructor(options: StorageConfig) {
    this.options = options;
  }

  abstract get<T>(params: Operation): Promise<StoreMetadata | null>;
  abstract set(params: Operation): Promise<string | void>;

  public log(type: keyof Console, ...args: any[]): void {
    if (this.options.debug) {
      log(type, ...args);
    }
  }
}

function log(type: keyof Console, ...args: any[]) {
  (console[type] as (...args: any[]) => void).call(console, ...args);
}

export class LocalStorage extends BaseStorage {
  constructor(options: StorageConfig) {
    super(options);
  }

  public async get(params: Operation): Promise<StoreMetadata | null> {
    try {
      const value = localStorage.getItem(params.key);
      if (!value) return null;
      return JSON.parse(value) as StoreMetadata;
    } catch (error) {
      this.log("error", `Failed to get from localStorage:`, error);
      return null;
    }
  }

  public async set(params: Operation): Promise<void> {
    try {
      if (!params.value) throw new Error("Value is required");
      const metadata: StoreMetadata = {
        key: params.key,
        value: params.value,
        version: this.options.version,
        updatedAt: Date.now(),
      };
      localStorage.setItem(params.key, JSON.stringify(metadata));
    } catch (error) {
      this.log("error", `Failed to set to localStorage:`, error);
    }
  }
}

export class DexieStorage extends BaseStorage {
  private storage: Dexie & {
    store: EntityTable<StoreMetadata, "key">;
  };

  constructor(options: StorageConfig) {
    super(options);
    this.storage = new Dexie(options.key) as Dexie & {
      // primary key "key" (for the typings only)
      store: EntityTable<StoreMetadata, "key">;
    };
    console.log(options.version);
    this.storage.version(options.version ?? 1).stores({
      store: "key,value,version,updatedAt,integrityHash",
    });
  }

  public async get(params: Operation) {
    return (await this.storage.store.get(params.key)) ?? null;
  }

  public async set(params: Operation) {
    if (!params.value) return this.log("error", "value is required");

    return await this.storage.store.put({
      key: params.key,
      value: params.value,
      version: this.options.version,
      integrityHash: "",
      updatedAt: Date.now(),
    });
  }
}

function calculateHash(value: string): string {
  // 这里可以实现自己的哈希算法
  return btoa(encodeURIComponent(value));
}

async function restoreState(
  store: StoreGeneric,
  options: PersistOptions<StateTree>,
  context: PiniaPluginContext,
) {
  try {
    options.beforeHydrate?.(context);

    const metadata = await store.$store.get({
      key: options.key ?? store.$id,
    });

    if (!metadata) return;

    // 版本检查
    if (metadata.version !== options.version)
      return log("warn", `Version mismatch for store "${store.$id}"`);

    const deserialized =
      options.serializer?.deserialize(metadata.value) ??
      JSON.parse(metadata.value);
    const picked = options.pick
      ? deepPickUnsafe(deserialized, options.pick)
      : deserialized;
    const omitted = options.omit
      ? deepOmitUnsafe(picked, options.omit)
      : picked;

    store.$patch(omitted);
    store.$metadata = metadata;

    options.afterHydrate?.(context);
  } catch (error) {
    log("error", `[persist] ${error}`);
  }
}

async function saveState(
  state: StateTree,
  store: StoreGeneric,
  options: PersistOptions<StateTree>,
) {
  try {
    const picked = options.pick ? deepPickUnsafe(state, options.pick) : state;
    const omitted = options.omit
      ? deepOmitUnsafe(picked, options.omit)
      : picked;
    const serialized =
      options.serializer?.serialize(omitted) ?? JSON.stringify(omitted);

    await store.$store.set({
      key: options.key ?? store.$id,
      value: serialized,
    });
  } catch (error) {
    log("error", `[persist] ${error}`);
  }
}

// function createPersist(config: PersistOptions): (context: PiniaPluginContext) => void {
//   const { version, key, debug } = config

//   const storageMap: Record<string, BaseStorage> = {
//     localStorage: new LocalStorage({
//       version,
//       key,
//       debug
//     }),
//     dexie: new DexieStorage({
//       version,
//       key,
//       debug
//     })
//   }

//   const storage: BaseStorage = storageMap[config.storage]

//   return function (context: PiniaPluginContext) {
//     const { store, options } = context
//     if (!options.persist) return

//     store.$store = storage

//     options.persist.forEach(item => {
//       store.$hydrate = async function () {
//         await restoreState(store, item, context)
//       }

//       store.$persist = async function () {
//         await saveState(store.$state, store, item, context)
//       }

//       store.$subscribe(
//         async function () {
//           await saveState(store.$state, store, item, context)

//           const metadata = await store.$store.get({
//             key: item.key ?? store.$id
//           })
//           if (!metadata) return
//           item.onMetadata?.(metadata)
//         },
//         {
//           detached: true
//         }
//       )
//     })
//   }
// }

export function createPersistedState(context: PiniaPluginContext): void {
  const { store, options } = context;
  if (!options.persist) return;

  const persistOptions = Array.isArray(options.persist)
    ? options.persist
    : [options.persist];

  persistOptions.forEach((persistOpt) => {
    const { storage: storageType, ...storageConfig } = persistOpt;
    const storage = new (
      storageType === "LocalStorage" ? LocalStorage : DexieStorage
    )(storageConfig);

    store.$store = {
      options: storageConfig,
      get: storage.get.bind(storage),
      set: storage.set.bind(storage),
      log: storage.log.bind(storage),
    };

    store.$persist = () => saveState(store.$state, store, persistOpt);
    store.$hydrate = () => restoreState(store, persistOpt, context);

    store.$subscribe(
      async () => {
        await store.$persist();
        const metadata = await store.$store.get({
          key: persistOpt.key ?? store.$id,
        });
        persistOpt.onMetadata?.(metadata!);
      },
      { detached: true },
    );

    // 初始化时恢复状态
    store.$hydrate();
  });
}

// export default createPersist

export function createPersistedstate(
  context: PiniaPluginContext,
): ReturnType<PiniaPlugin> {
  if (!context.options.persist) return;
  context.options.persist.forEach((item) => {
    createPersistedState(context);
  });
}

// const storageOptions: PersistOptions<StateTree> = {
//   key: item.key ?? store.$id,
//   version: item.version,
//   storage: item.storage,
//   serializer: item.serializer,
//   debug: item.debug,
//   onMetadata: item.onMetadata,
//   beforeHydrate: item.beforeHydrate,
//   afterHydrate: item.afterHydrate,
//   pick: item.pick,
//   omit: item.omit
// }
