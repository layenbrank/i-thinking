/* eslint-disable no-var */

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string

	readonly VITE_ENGINE: string
	readonly VITE_EXTENSION: string
	readonly VITE_INTELLIGENCE: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

type EnvURL = 'extension' | 'engine' | 'intelligence'

interface Window {
	MediaStreamTrackProcessor: typeof MediaStreamTrackProcessor
}

var MediaStreamTrackProcessor: {
	prototype: MediaStreamTrackProcessor
	new (options: MediaStreamTrack): TransformStream
}
