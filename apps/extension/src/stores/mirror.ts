import { database } from '@/database/database.ts'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery, type InsertType, type UpdateSpec } from 'dexie'
import { from } from 'rxjs'

export const useMirrorStore = defineStore('mirror', function () {
	const mirrorID = ref('')

	const mirrors = useObservable(
		from(
			liveQuery(function () {
				return database.mirror.where('id').equals(mirrorID.value).toArray()
			})
		)
	)

	const applications = useObservable(
		from(
			liveQuery(function () {
				return database.application.each(function (application, cursor) {
					console.log('application', application, 'cursor', cursor)
					return application.mirrorID === mirrorID.value
				})
			})
		)
	)

	/**
	 * 插入一条 Mirror 记录
	 * @param mirror 允许缺省 id，由函数生成；其它字段未提供时给出最小默认值
	 * @returns 生成或使用的主键 id
	 */
	function toInsert(mirror: InsertType<Mirror, 'id'>) {
		const id = mirror.id ?? crypto.randomUUID()
		const now = Date.now()
		const record: Mirror = {
			id,
			name: mirror.name ?? '',
			sort: mirror.sort ?? 0,
			marker: mirror.marker ?? '',
			description: mirror.description ?? '',
			updatedAt: mirror.updatedAt ?? now,
			createdAt: mirror.createdAt ?? now
		}
		return database.mirror.add(record)
	}

	/** 更新指定 ID 记录，返回修改的字段数 */
	function toUpdate(ID: string, updates: UpdateSpec<Mirror>) {
		return database.mirror.update(ID, updates)
	}

	/** 删除指定 ID */
	function toRemove(ID: string) {
		return database.mirror.delete(ID)
	}
	/** 读取单条记录 */
	function toRead(ID: string) {
		return database.mirror.get(ID)
	}

	return {
		mirrorID,
		mirrors,
		applications,
		toInsert,
		toUpdate,
		toRemove,
		toRead
	}
})
