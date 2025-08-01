import { defineStore } from 'pinia'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

export const useBookmarksStore = defineStore(
	'bookmarks',
	function () {
		const bookmarks = ref<BookmarkTreeNode[]>([])

		return {
			bookmarks
		}
	}
	// {
	//   persist: {
	//     key: 'bookmarks',
	//     storage: localStorage,
	//     pick: ['bookmarks'],
	//   },
	// },
)
