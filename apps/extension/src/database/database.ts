/* eslint-disable @typescript-eslint/no-unused-vars */

import { Dexie, type EntityTable } from 'dexie'

type Bookmark = Application.Bookmark
type BookmarkFolder = Application.BookmarkFolder

interface DataBase extends Dexie {
	application: EntityTable<Application, 'id'>

	backup: EntityTable<ApplicationBackup, 'id'>

	setting: EntityTable<ApplicationSettings, 'id'>

	user: EntityTable<UserProfile, 'id'>

	bookmark: EntityTable<Bookmark, 'id'>
	bookmarkFolder: EntityTable<BookmarkFolder, 'id'>
}

const DBNAME: Readonly<string> = 'desktop-app'

export const database = new Dexie(DBNAME) as DataBase

database.version(1).stores({
	application:
		'&id,slideID,[id+slideID],sort,app,name,downloadCount,direction,shape,size,width,height,round,icon,url,backgroundColor,backgroundImage,textColor,textSize',

	user: '++id,name',

	bookmark: '&id,url,sort,title,folderID,createdAt,updatedAt',
	bookmarkFolder: '&id,folder,sort,count,createdAt,updatedAt'
})

database.on(
	'ready',
	function (db) {
		if (!import.meta.env.DEV) return
		console.log('数据库已准备就绪，当前版本:', db.verno)
		for (const table of db.tables) {
			table.count().then(function (count) {
				log(`${table.name}表记录数:`, count.toString())
			})
		}
	},
	true
)

database.on('populate', function (tx) {})

database.on('versionchange', function (e) {})

database.on('blocked', function (e) {
	if (!import.meta.env.DEV) return
	console.error('数据库被阻塞，请关闭其他使用此数据库的标签页')
})

function log(label: string, msg: string) {
	if (!import.meta.env.DEV) return
	console.log(
		`%c ${label} ${msg}`,
		'background:#3B82FE; padding: 3px; padding-right: 8px; border-radius: 3px; color: #fff;'
	)
}

window.addEventListener('unhandledrejection', function (e) {
	const reason = e.reason
	const msg = 'DataBaseClosedError'
	if (!reason) return
	if (!(reason.name === msg)) return
	alert('数据库异常关闭，请刷新页面')
})
