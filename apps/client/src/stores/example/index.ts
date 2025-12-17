/**
 * @module stores
 * @description Zustand Store 统一入口
 *
 * 集成了以下高级特性：
 * - Zustand 中间件链 (devtools, immer, subscribeWithSelector)
 * - Dexie liveQuery 响应式数据同步
 * - RxJS 事件总线和数据流处理
 * - 乐观更新与回滚机制
 * - 切片模式 (Slices Pattern)
 */

// ============================================================================
// Mirror Store
// ============================================================================

export {
	destroyDexieSync,
	filteredMirrors$,
	getRecentEvents,
	// 初始化/销毁
	initDexieSync,
	// RxJS Observables
	mirrorEvents$,
	mirrorSearchTerm$,
	selectedApplication$ as mirrorSelectedApplication$,
	// RxJS utilities
	onMirrorEvent,
	selectedMirror$,
	// Subscriptions
	subscribeMirrorsChange,
	subscribeSelectedMirrorChange,
	useApplicationsByMirrorId,
	useApplications as useMirrorApplications,
	useError as useMirrorError,
	useLoading as useMirrorLoading,
	// Selectors
	useMirrors,
	useSelectedApplication as useMirrorSelectedApplication,
	useMirrorStats,
	// Store
	useMirrorStore,
	useSelectedMirror,
	waitForEvent
} from './mirror'

// ============================================================================
// Application Store
// ============================================================================

export {
	// RxJS Observables
	applicationEvents$,
	applicationsByComponent$,
	applicationsByMirror$,
	applicationSearchTerm$,
	destroyApplicationSync,
	filteredApplications$,
	filterMirrorId$,
	// 初始化/销毁
	initApplicationSync,
	onApplicationEvent,
	selectedApplication$,
	sortOptions$,
	// Subscriptions
	subscribeApplicationsChange,
	useApplicationError,
	useApplicationLoading,
	// Selectors
	useApplications,
	useApplicationsByComponent,
	useApplicationStats,
	// Store
	useApplicationStore,
	useApplicationsByMirrorId as useFilteredApplicationsByMirrorId,
	useSelectedApplication
} from './application'

// ============================================================================
// Counter Store (示例)
// ============================================================================

export { useCounterStore } from '../counter'

// ============================================================================
// 工具函数
// ============================================================================

// Dexie 同步工具
export {
	createCachedQuery,
	createFilteredQuery,
	createInvalidatableQuery,
	createOptimisticCRUD,
	createPaginatedQuery,
	createReactiveQuery,
	DexieSync,
	SyncManager,
	syncManager
} from './utils/dexie-sync'

// RxJS 桥接工具
export {
	appCommandBus,
	appEventBus,
	batchProcess,
	CommandBus,
	concurrentLimit,
	createEventListener,
	createStateTracker,
	createSubscriptionFactory,
	createTwoWayBinding,
	debounceDistinct,
	EventBus,
	observableToStore,
	retryWithBackoff,
	storeToObservable,
	type AppCommandMap,
	type AppEventMap
} from '../utils/rx-bridge'

// ============================================================================
// 全局初始化
// ============================================================================

/**
 * 初始化所有 Store 同步
 * 建议在应用启动时调用
 */
export function initAllStores(): void {
	// Mirror 和 Application 同步在模块加载时自动初始化
	// 这里可以添加额外的初始化逻辑
	if (import.meta.env.DEV) {
		console.log('[Stores] All stores initialized')
	}
}

/**
 * 销毁所有 Store 同步
 * 建议在应用卸载时调用
 */
export function destroyAllStores(): void {
	// 由各模块的 beforeunload 事件处理
	if (import.meta.env.DEV) {
		console.log('[Stores] All stores destroyed')
	}
}
