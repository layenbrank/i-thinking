import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')
const repoRoot = resolve(__dirname, '..', '..')

const apps = ['client', 'devtools', 'extension', 'service']

async function existsNonEmptyDir(p) {
	try {
		const st = await stat(p)
		if (!st.isDirectory()) return false
		const files = await readdir(p)
		return files.length > 0
	} catch {
		return false
	}
}

async function copyDir(src, dest) {
	await rm(dest, { recursive: true, force: true })
	await mkdir(dest, { recursive: true })
	// Node >=16: fs.cp supports recursive copy
	await cp(src, dest, { recursive: true, force: true })
}

async function main() {
	const outputs = []
	for (const app of apps) {
		const src = join(repoRoot, 'apps', app, 'dist')
		const dest = join(repoRoot, 'dist', app)
		if (await existsNonEmptyDir(src)) {
			await copyDir(src, dest)
			outputs.push({ app, dest })
		}
	}

	if (outputs.length === 0) {
		console.log('[bundle] No app dist found. Did you run build?')
		process.exit(0)
	}

	console.log('[bundle] Collected outputs:')
	for (const o of outputs) {
		console.log(` - ${o.app} -> ${o.dest}`)
	}
}

main().catch((err) => {
	console.error('[bundle] Failed:', err)
	process.exit(1)
})
