/* eslint-disable no-var */

interface ImportMetaEnv {
	readonly VITE_APP_EXT: string
	readonly VITE_APP_TITLE: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

interface Window {
	MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor
}

var MediaStreamTrackProcessor: {
	prototype: MediaStreamTrackProcessor
	new (options: MediaStreamTrack): TransformStream
}

interface StoreSchema {
	id: string
	createdAt: number
	updatedAt: number
}
