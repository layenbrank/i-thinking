import { readFile, writeFile } from 'node:fs'
import { resolve } from 'node:path'

readFile(
	resolve(__dirname, '..', 'package.json'),
	{
		encoding: 'utf-8'
	},
	function (error, data) {
		if (error) return console.error(`Read failed: ${error}`)
		const parsed = JSON.parse(data)

		console.log('Read succeeded! Package: ', parsed.name)

		const packageJson = {
			scripts: {
				dev: parsed.scripts.dev,
				preview: parsed.scripts.preview
			},
			dependencies: parsed.dependencies
		}

		writeFile(
			resolve(__dirname, '..', 'dist/package.json'),
			JSON.stringify(packageJson, null, 2),
			function (error) {
				if (error) console.error(`Write failed: ${error}`)
				else console.log('Write succeeded!')
			}
		)
	}
)
