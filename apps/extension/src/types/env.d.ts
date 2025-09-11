/* eslint-disable no-var */
interface ImportMetaEnv {
	readonly VITE_APP_EXT: string
	readonly VITE_APP_TITLE: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

// globals.d.ts 或者 src/types/global.d.ts
interface Window {
	MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor
}

var MediaStreamTrackProcessor: {
	prototype: MediaStreamTrackProcessor
	new (options: MediaStreamTrack): TransformStream
}
