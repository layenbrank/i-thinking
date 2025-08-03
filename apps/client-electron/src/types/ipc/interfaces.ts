import { IpcStatus } from './channels'

/**
 * IPC响应基础接口
 */
export interface IpcResponse<T = any> {
	status: IpcStatus
	data?: T
	error?: string
	timestamp: number
}

/**
 * 文件监控相关接口
 */
export interface FileMonitorParams {
	folderPath?: string
	action?: 'start' | 'stop'
	options?: {
		ignored?: string | RegExp | Array<string | RegExp>
		persistent?: boolean
		ignoreInitial?: boolean
	}
}

export interface FileInfo {
	path: string
	name: string
	isDirectory: boolean
	size?: number
	modifiedTime?: Date
}

export interface FileChangeInfo {
	path: string
	event: 'add' | 'change' | 'unlink'
	timestamp: number
}

// 使用类型别名代替空接口扩展
export type FileListResponse = IpcResponse<FileInfo[]>
export type FileMonitorResponse = IpcResponse<{
	folderPath: string
	isWatching: boolean
}>
export type FileChangeResponse = IpcResponse<FileChangeInfo>
