import { liveQuery } from 'dexie'
import { useObservable } from '@vueuse/rxjs'
import { from, tap } from 'rxjs'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

export function useBookMark() {
	const bookmarks = useObservable(
		from(liveQuery(() => chrome.bookmarks.getTree())).pipe(
			tap((bookmarks) => {
				console.log('bookmarks', bookmarks)
			})
		)
	)

	function flattenBookmarks(bookmarks: BookmarkTreeNode[]): BookmarkTreeNode[] {
		const nodes: BookmarkTreeNode[] = []
		const stack: BookmarkTreeNode[] = [...bookmarks] // 初始化栈

		while (stack.length > 0) {
			const bookmark = stack.pop() // 弹出栈顶元素
			// 防止意外空值
			if (!bookmark) continue

			// 如果当前节点有子节点，则将其子节点压入栈中
			if (bookmark.children && bookmark.children.length > 0) {
				stack.push(...bookmark.children)
			}
			// 过滤条件：排除 id 为 '0' 的根节点 或 标题为空的项
			if (bookmark.id === '0') continue
			else if (!bookmark.title.trim()) continue

			// 将当前节点添加到结果中（不保留 children 属性，避免冗余） 解构移除 children 属性
			const { children, ...remains } = bookmark
			// 使用 unshift 来保持顺序
			nodes.unshift(remains)
		}

		return nodes
	}

	return {
		flattenBookmarks
	}
}
