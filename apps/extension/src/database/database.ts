import type { AiMessage, AiSession } from '@/database/schemas/intelligence.ts'
import { Dexie, type EntityTable } from 'dexie'

type Bookmark = Application.Bookmark
type BookmarkDir = Application.BookmarkDir

interface DataBase extends Dexie {
	mirror: EntityTable<Mirror, 'id'>
	application: EntityTable<Application, 'id'>

	backup: EntityTable<Backup, 'id'>

	settings: EntityTable<Settings, 'id'>

	user: EntityTable<UserProfile, 'id'>

	bookmark: EntityTable<Bookmark, 'id'>
	bookmarkDir: EntityTable<BookmarkDir, 'id'>

	markdown: EntityTable<Markdown, 'id'>

	AiSession: EntityTable<AiSession, 'id'>
	AiMessage: EntityTable<AiMessage, 'id'>
}

const DBNAME: Readonly<string> = 'i thinking'

export const database = new Dexie(DBNAME) as DataBase

const MIRROR: readonly string[] = [
	'&id',
	'index',
	'title',
	'marker',
	'description',
	'updatedAt',
	'createdAt'
]
const APPLICATION: readonly string[] = [
	'&id',
	'[id+mirrorID]',
	'[id+collectionID]',
	'[mirrorID+collectionID]',
	'mirrorID',
	'collectionID',
	'index',
	'component',
	'title',
	'size',
	'shape',
	'direction',
	'url',
	'marker',
	'round',
	'textSize',
	'textColor',
	'downloadCount',
	'backgroundColor',
	'backgroundImage',
	'updatedAt',
	'createdAt'
]

const COLLECTION: readonly string[] = APPLICATION.filter((field) => field !== 'mirrorID')

const USERS: readonly string[] = ['++id', 'name']

const BACKUP: readonly string[] = ['&id', 'createdAt', 'updatedAt']
const SETTING: readonly string[] = ['&id', 'theme', 'language']

const BOOKMARK: readonly string[] = [
	'&id',
	'url',
	'sort',
	'title',
	'folderID',
	'createdAt',
	'updatedAt'
]
const BOOKMARK_DIR: readonly string[] = ['&id', 'folder', 'sort', 'count', 'createdAt', 'updatedAt']

const MARKDOWN: readonly string[] = ['&id', 'sort', 'createdAt', 'updatedAt']

const AISESSION: readonly string[] = [
	'&id',
	'index',
	'title',
	'userID',
	'messages',
	'createdAt',
	'updatedAt'
]

const AIMESSAGE: readonly string[] = [
	'&id',
	'sessionID',
	'role',
	'content',
	'createdAt',
	'updatedAt'
]

database.version(1).stores({
	mirror: MIRROR.join(','),
	application: APPLICATION.join(','),

	backup: BACKUP.join(','),
	setting: SETTING.join(','),

	user: USERS.join(','),

	bookmark: BOOKMARK.join(','),
	bookmarkDir: BOOKMARK_DIR.join(','),

	markdown: MARKDOWN.join(','),

	AiSession: AISESSION.join(','),
	AiMessage: AIMESSAGE.join(',')
})

database.on(
	'ready',
	function (db) {
		if (!import.meta.env.DEV) return
		console.log('数据库已准备就绪，当前版本:', db.verno)
		for (const table of db.tables) {
			void table.count().then(function (count) {
				log(`${table.name}表记录数:`, count.toString())
			})
		}
	},
	true
)

// database.on('populate', function (tx) {})

// database.on('versionchange', function (e) {})

database.on('blocked', function (_e) {
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
