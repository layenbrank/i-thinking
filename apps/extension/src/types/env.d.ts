/* eslint-disable no-var */

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string

	readonly VITE_APP_ENGINE: string
	readonly VITE_APP_EXTENSION: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

type EnvURL = 'extension' | 'engine'

interface Window {
	MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor
}

var MediaStreamTrackProcessor: {
	prototype: MediaStreamTrackProcessor
	new (options: MediaStreamTrack): TransformStream
}
