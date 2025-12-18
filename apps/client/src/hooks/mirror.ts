import { useLiveQuery, useObservable, useDocument, usePermissions } from 'dexie-react-hooks'
import { isEmpty } from 'lodash-es'

// 1. 引入默认数据（和 extension 里的 useMirror 一样）
import { BuildMirror } from '@/constants/mirror.ts' // 如果 client 端也有这个 Hook
import { useMirrorStore } from '@/stores/mirror.ts'
import { database } from '@/databases/database.ts'

// 2. 导出 React Hook：useMirrors
export function useMirrors(): Mirror[] {
	const { MIRRORS } = BuildMirror()
	const mirrorID = useMirrorStore((state) => state.mirrorID)

	const mirrors = useLiveQuery<Mirror[], Mirror[]>(
		async function () {
			const values = await database.mirror.orderBy('index').toArray()
			// 空表时填充默认数据
			if (isEmpty(values)) {
				await database.mirror.bulkAdd(MIRRORS)
				return database.mirror.orderBy('index').toArray()
			}
			return values
		},
		[],
		[]
	)

	// 自动更新 mirrorID（等价于 pinia 里的 tap + mirrorID.value = value.id）
	useEffect(
		function () {
			if (!mirrors.length) return
			const [mirror] = mirrors
			if (mirror.id && mirrorID === null) {
				useMirrorStore.setState({ mirrorID: mirror.id })
			}
		},
		[mirrors]
	)

	return mirrors
}
