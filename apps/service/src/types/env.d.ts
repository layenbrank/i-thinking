declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: 'development' | 'production' | 'test'
			// API_URL: string

			PROTOCOL: string
			HOSTNAME: string
			PORT: string

			DATABASE_URL: string

			JWT_SECRET: string
			JWT_EXPIRES_IN: string
		}
	}
}
export {}
