import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { from, Observable, switchMap, tap } from 'rxjs'
// import { folderModule } from '@/database/bookmark/folder.module.ts'
// import { bookmarkModule } from '@/database/bookmark/bookmark.module.ts'
// import type { Bookmark } from '@/database/bookmark/bookmark.entity.ts'
// import type { BookmarkFolder } from '@/database/bookmark/folder.entity.ts'
import { database } from '@/database/database.ts'
import { message } from 'ant-design-vue'
import { isEmpty } from 'lodash-es'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode
type Bookmark = Application.Bookmark
type BookmarkFolder = Application.BookmarkFolder
export interface BookmarkParse {
	bookmarks: Bookmark[]
	folders: BookmarkFolder[]
}

export function useBookMark() {
	const activeFolder = ref<BookmarkFolder | null>(null)

	const targetBookmarks = ref<Bookmark[] | undefined>([])

	const folders = useObservable(
		from(
			liveQuery(function (): Promise<BookmarkFolder[]> {
				// return folderModule.orderBy('sort').toArray()
				return database.bookmarkFolder.orderBy('sort').toArray()
			})
		).pipe(
			tap(function (folders) {
				if (isEmpty(folders)) return
				else {
					const [folder] = folders
					console.log('activeFolder', folder)
					if (!folder) return

					activeFolder.value = folder
				}
			})
		)
	)

	// 获取Chrome书签树的响应式数据
	const bookmarks = useObservable(
		from(
			liveQuery(function () {
				// return bookmarkModule.orderBy('sort').toArray()
				return database.bookmark.orderBy('sort').toArray()
			})
		).pipe(
			tap(function (response) {
				if (isEmpty(response)) void handleRefreshBookmarks()
			})
		)
	)

	const sourceBookmarks = useObservable(
		new Observable<string>(function (subscribe) {
			watchEffect(function () {
				const ID = activeFolder.value?.id
				if (!ID) return
				subscribe.next(ID)
			})
		}).pipe(
			switchMap(function (ID) {
				return database.bookmark.where('folderID').equals(ID).toArray()
			}),
			tap(function (resp) {
				targetBookmarks.value = resp
				console.log('targetBookmarks', targetBookmarks.value, 'resp', resp)
			})
		)
	)

	const recentBookmarks = computed(function () {
		return bookmarks.value?.filter(function (bookmark) {
			// 创建时间小于当前时间 7 天数
			return bookmark.createdAt < Date.now() - 1000 * 60 * 60 * 24 * 7
		})
	})

	async function handleRefreshBookmarks() {
		const bookmarkTreeRes = await chrome?.bookmarks?.getTree()

		const parsed = parseBookmarkTree(bookmarkTreeRes)

		void database.bookmark.bulkPut(parsed.bookmarks)
		void database.bookmarkFolder.bulkPut(parsed.folders)

		for (const folder of parsed.folders) {
			await database.bookmark
				.where('folderID')
				.equals(folder.id)
				.count(function (count) {
					void database.bookmarkFolder.update(folder.id, {
						count
					})
				})
		}

		const [folder] = parsed.folders || []

		activeFolder.value = folder ?? null

		message.success('书签更新成功')
	}

	/**
	 * 将Chrome书签树扁平化并分类为书签和文件夹
	 * @param bookmarkNodes Chrome书签节点数组
	 * @returns 包含书签和文件夹的分类结果
	 */
	function parseBookmarkTree(bookmarkNodes: BookmarkTreeNode[]): BookmarkParse {
		const parsedBookmarks: Bookmark[] = []
		const parsedFolders: BookmarkFolder[] = []
		const toUpdateNodeStack: BookmarkTreeNode[] = [...bookmarkNodes]

		while (toUpdateNodeStack.length > 0) {
			const node = toUpdateNodeStack.pop()

			// 跳过空节点
			if (!node) continue

			// 将子节点添加到处理栈中
			if (node.children?.length) toUpdateNodeStack.push(...node.children)

			// 跳过根节点和空标题节点
			if (isInvalidNode(node)) continue

			// 根据是否有URL属性来区分书签和文件夹
			if (isBookmarkNode(node)) {
				const transformedBookmark = transformToBookmark(node, parsedBookmarks.length)
				parsedBookmarks.push(transformedBookmark)
			} else {
				const transformedFolder = transformToFolder(node, parsedFolders.length)
				parsedFolders.push(transformedFolder)
			}
		}

		return {
			bookmarks: parsedBookmarks,
			folders: parsedFolders
		}
	}

	/**
	 * 判断节点是否为无效节点（根节点或空标题节点）
	 */
	function isInvalidNode(node: BookmarkTreeNode): boolean {
		return node.id === '0' || !node.title?.trim()
	}

	/**
	 * 判断节点是否为书签（有URL属性）
	 */
	function isBookmarkNode(node: BookmarkTreeNode): boolean {
		return Boolean(node.url)
	}

	/**
	 * 将Chrome书签节点转换为Bookmark实体
	 * @param bookmarkNode Chrome书签节点
	 * @param sortIndex 排序索引（当前数组长度）
	 */
	function transformToBookmark(bookmarkNode: BookmarkTreeNode, sortIndex: number): Bookmark {
		return {
			id: bookmarkNode.id,
			url: bookmarkNode.url ?? '',
			title: bookmarkNode.title,
			icon: '', // Chrome API不直接提供图标，需要额外获取
			folderID: bookmarkNode.parentId ?? '',
			sort: sortIndex,
			description: '', // Chrome API不提供描述字段
			createdAt: bookmarkNode.dateAdded ?? Date.now(),
			updatedAt: bookmarkNode.dateGroupModified ?? Date.now()
		}
	}

	/**
	 * 将Chrome文件夹节点转换为BookmarkFolder实体
	 * @param bookmarkNode Chrome书签节点
	 * @param sortIndex 排序索引（当前数组长度）
	 */
	function transformToFolder(bookmarkNode: BookmarkTreeNode, sortIndex: number): BookmarkFolder {
		return {
			count: 0,
			id: bookmarkNode.id,
			folder: bookmarkNode.title,
			sort: sortIndex,
			createdAt: bookmarkNode.dateAdded ?? Date.now(),
			updatedAt: bookmarkNode.dateGroupModified ?? Date.now()
		}
	}

	return {
		folders,
		bookmarks,
		activeFolder,
		sourceBookmarks,
		targetBookmarks,
		recentBookmarks,
		isInvalidNode,
		isBookmarkNode,
		parseBookmarkTree,
		transformToFolder,
		transformToBookmark,
		handleRefreshBookmarks
	}
}
