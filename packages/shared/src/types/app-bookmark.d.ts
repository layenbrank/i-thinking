declare namespace Application {
	/**
	 * @description 书签
	 */
	interface Bookmark {
		id: string
		url: string
		sort: number
		icon: string
		title: string
		folderID: string
		createdAt: number
		updatedAt: number
		description: string
	}

	/**
	 * @description 书签文件夹
	 */
	interface BookmarkFolder {
		id: string
		sort: number
		count: number
		folder: string
		createdAt: number
		updatedAt: number
	}
}
