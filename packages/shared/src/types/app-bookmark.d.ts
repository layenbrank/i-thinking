declare namespace Application {
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

	interface BookmarkFolder {
		id: string
		sort: number
		count: number
		folder: string
		createdAt: number
		updatedAt: number
	}
}
