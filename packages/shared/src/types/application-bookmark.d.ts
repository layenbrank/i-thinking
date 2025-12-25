declare namespace Application.Bookmark {
  /**
   * @description 书签
   */
  interface Entry {
    id: string
    url: string
    index: number
    icon: string
    title: string
    dirID: string
    createdAt: number
    updatedAt: number
    description: string
  }

  /**
   * @description 书签文件夹
   */
  interface Directory {
    id: string
    index: number
    count: number
    title: string
    createdAt: number
    updatedAt: number
  }
}
