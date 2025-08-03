import type { IPCChannel } from './ipc-channel'

// Used in Renderer process, expose in `preload.ts`
declare global {
	interface Window {
		ipcRenderer: Electron.IpcRenderer
	}

	namespace Electron {
		interface IpcRenderer {
			on(channel: IPCChannel, listener: (event: IpcRendererEvent, ...args: any[]) => void): this

			send(channel: IPCChannel, ...args: any[]): void
		}

		interface IpcMain {
			on(channel: IPCChannel, listener: (event: IpcMainEvent, ...args: any[]) => void): this
		}

		interface WebContents {
			send(channel: IPCChannel, ...args: any[]): void
		}
	}
}
