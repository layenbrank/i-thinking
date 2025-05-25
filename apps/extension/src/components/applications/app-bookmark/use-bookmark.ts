import { liveQuery } from 'dexie'
import bookmarkJSON from './bookmark.json'
import { useObservable } from '@vueuse/rxjs'
import { from, Observable, switchMap, tap } from 'rxjs'
import { folderModule } from '@/database/bookmark/folder.module.ts'
import { bookmarkModule } from '@/database/bookmark/bookmark.module.ts'
import type { Bookmark } from '@/database/bookmark/bookmark.entity.ts'
import type { BookmarkFolder } from '@/database/bookmark/folder.entity.ts'
import { isEmpty } from 'lodash-es'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

export interface BookmarkParse {
  bookmarks: Bookmark[]
  folders: BookmarkFolder[]
}

export function useBookMark() {
  const activeFolder = ref<BookmarkFolder | null>(null)

  const sourceBookmarks = ref<Bookmark[]>([])
  const targetBookmarks = ref<Bookmark[]>([])
  const sourceFolders = ref<BookmarkFolder[]>([])
  const targetFolders = ref<BookmarkFolder[]>([])

  const folders = useObservable(
    from(
      liveQuery(function (): Promise<BookmarkFolder[]> {
        return folderModule.orderBy('sort').toArray()
      })
    )
  )

  // 获取Chrome书签树的响应式数据
  const bookmarks = useObservable(
    new Observable<BookmarkFolder | null>(function (subscribe) {
      watchEffect(function () {
        subscribe.next(activeFolder.value)
      })
    }).pipe(
      switchMap(function (folder) {
        return liveQuery(function () {
          const folderId = folder?.id || folders.value?.[0]?.id || '1'

          return bookmarkModule
            .where('folderId')
            .equals(folderId)
            .and((bookmark) => bookmark.folderId !== '0')
            .sortBy('sort')
        })
      }),
      tap(function (response) {
        if (isEmpty(response)) updateBookmarks()
      })
    )
  )

  const recentBookmarks = computed(function () {
    return bookmarks.value?.filter(function (bookmark) {
      // 创建时间小于当前时间 7 天数
      return bookmark.createdAt < Date.now() - 1000 * 60 * 60 * 24 * 7
    })
  })

  async function updateBookmarks() {
    const bookmarkRes = await chrome?.bookmarks?.getTree()

    const parseBookmarks = parseBookmarkTree(bookmarkRes)

    bookmarkModule.bulkPut(parseBookmarks.bookmarks)
    folderModule.bulkPut(parseBookmarks.folders)

    const [folder] = parseBookmarks.folders || []
    activeFolder.value = folder || null

    sourceBookmarks.value = parseBookmarks.bookmarks
  }

  /**
   * 将Chrome书签树扁平化并分类为书签和文件夹
   * @param bookmarkNodes Chrome书签节点数组
   * @returns 包含书签和文件夹的分类结果
   */
  function parseBookmarkTree(bookmarkNodes: BookmarkTreeNode[]): BookmarkParse {
    const parsedBookmarks: Bookmark[] = []
    const parsedFolders: BookmarkFolder[] = []
    const nodeProcessingStack: BookmarkTreeNode[] = [...bookmarkNodes]

    while (nodeProcessingStack.length > 0) {
      const node = nodeProcessingStack.pop()

      // 跳过空节点
      if (!node) continue

      // 将子节点添加到处理栈中
      if (node.children?.length) nodeProcessingStack.push(...node.children)

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
      url: bookmarkNode.url!,
      title: bookmarkNode.title,
      icon: '', // Chrome API不直接提供图标，需要额外获取
      folderId: bookmarkNode.parentId || '',
      sort: sortIndex,
      description: '', // Chrome API不提供描述字段
      createdAt: bookmarkNode.dateAdded || Date.now(),
      updatedAt: bookmarkNode.dateGroupModified || Date.now()
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
      createdAt: bookmarkNode.dateAdded || Date.now(),
      updatedAt: bookmarkNode.dateGroupModified || Date.now()
    }
  }

  return {
    folders,
    bookmarks,
    sourceBookmarks,
    recentBookmarks,
    activeFolder,
    isInvalidNode,
    isBookmarkNode,
    parseBookmarkTree,
    transformToFolder,
    transformToBookmark
  }
}
