import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, relative, sep } from 'node:path'
import { readdirSync, readFile, readFileSync, statSync, watch } from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
	win = new BrowserWindow({
		// width: 800,
		width: 1200,
		// minWidth: 800,
		// height: 600,
		height: 800,
		// minHeight: 600,
		center: true,
		movable: true,
		roundedCorners: true,
		// backgroundMaterial: 'acrylic',
		// transparent: true,
		maximizable: true,
		icon: join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: join(__dirname, 'preload.mjs')
		}
	})

	// Test active push message to Renderer-process.
	win.webContents.on('did-finish-load', function () {
		win?.webContents.send('main-process-message', new Date().toLocaleString())
	})

	win.webContents.openDevTools({
		mode: 'right'
	})

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL)
	} else {
		// win.loadFile('dist/index.html')
		win.loadFile(join(RENDERER_DIST, 'index.html'))
	}
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit()
		win = null
	}
})

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (!BrowserWindow.getAllWindows().length) {
		createWindow()
	}
})

app
	.whenReady()
	.then(createWindow)
	.then(function () {
		Menu.setApplicationMenu(null)

		ipcMain.on('monitor-changes', async function (event) {
			const { canceled, filePaths } = await dialog.showOpenDialog({
				properties: ['openDirectory']
			})

			if (canceled) return

			const [folderPath] = filePaths
			const allFilePaths = useFilePaths(folderPath)

			// 监听文件变化
			watch(folderPath, (eventType, filename) => {
				console.log('File changed:', filename)
				console.log('Event type:', eventType)

				// 当文件变化时重新获取所有文件列表
				const updatedPaths = useFilePaths(folderPath)
				event.sender.send('monitor-changes', updatedPaths)
			})

			event.sender.send('monitor-changes', folderPath, allFilePaths)
		})
		// ipcMain.on('', function () {})
	})

function useFilePaths(basePath: string): string[] {
	const results: string[] = []
	const baseFolder = basename(basePath) // 获取基础文件夹名称 (dist)

	function traverse(dirPath: string) {
		const dirs = readdirSync(dirPath)

		for (const file of dirs) {
			const fullPath = join(dirPath, file)
			const stat = statSync(fullPath)

			const isDirectory = stat.isDirectory()

			if (isDirectory) traverse(fullPath)
			else {
				const relativePath = relative(basePath, fullPath)
				results.push(`${baseFolder}/${relativePath.split(sep).join('/')}`)
			}
		}
	}

	traverse(basePath)

	return results
}

function useFileMonitor(folderPath: string) {
	ipcMain.on('monitor-changes', async function (event) {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ['openDirectory']
		})

		if (canceled) return

		const [folderPath] = filePaths
		const allFilePaths = useFilePaths(folderPath)

		// 监听文件变化
		watch(folderPath, function (eventType, filename) {
			console.log('File changed:', filename)
			console.log('Event type:', eventType)

			// 当文件变化时重新获取所有文件列表
			const updatedPaths = useFilePaths(folderPath)
			event.sender.send('monitor-changes', updatedPaths)
		})

		event.sender.send('monitor-changes', folderPath, allFilePaths)
	})
}
