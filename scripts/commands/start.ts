import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'

// 定义项目类型
interface Project {
	name: string
	command: string
	description?: string
}

// 命令策略映射
const COMMAND_STRATEGIES = {
	all: () => 'pnpm dev',
	specific: (projectName: string) => `pnpm dev:${projectName}`
}

// 获取项目根目录
const ROOT_DIR = process.cwd()
const APPS_DIR = join(ROOT_DIR, 'apps')

/**
 * 自动检测项目
 * @returns 项目列表
 */
async function detectProjects(): Promise<Project[]> {
	const projects: Project[] = [
		{
			name: '所有项目',
			command: COMMAND_STRATEGIES.all(),
			description: '启动所有项目'
		}
	]

	try {
		// 检查 apps 目录是否存在
		let appsDirectoryExists = false
		try {
			const appsStats = await stat(APPS_DIR)
			appsDirectoryExists = appsStats.isDirectory()
		} catch (error) {
			// 目录不存在，忽略错误
		}

		if (appsDirectoryExists) {
			// 使用 Node.js 新的异步方法读取目录
			const appFolders = await readdir(APPS_DIR, { withFileTypes: true })
			const appDirectories = appFolders
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name)

			console.log('appDirectories', appDirectories)
			// 并行处理所有项目信息获取
			const projectInfos = await Promise.all(appDirectories.map(extractProjectInfo))

			// 添加所有有效的项目信息
			projects.push(...projectInfos)
		}
	} catch (error) {
		console.error(chalk.redBright('✘ 检测项目时出错:'), error)
	}

	return projects
}

/**
 * 从项目文件夹提取项目信息
 * @param folderName 项目文件夹名
 * @returns 项目信息
 */
async function extractProjectInfo(folderName: string): Promise<Project> {
	let description = `启动 ${folderName} 项目`

	try {
		const packageJsonPath = join(APPS_DIR, folderName, 'package.json')
		console.log('packageJsonPath', packageJsonPath)
		if (existsSync(packageJsonPath)) {
			try {
				const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
				const packageJson = JSON.parse(packageJsonContent)
				if (packageJson.description) {
					description = packageJson.description
				}
			} catch (error) {
				console.error(chalk.yellowBright(`⚠️ 读取 ${folderName} 的 package.json 失败`))
			}
		}
	} catch (error) {
		console.error(chalk.yellowBright(`⚠️ 处理 ${folderName} 项目信息时出错`))
	}

	return {
		name: folderName,
		command: COMMAND_STRATEGIES.specific(folderName),
		description
	}
}

/**
 * 启动项目命令
 */
export async function startProject() {
	const title = chalk.bgCyanBright.black(' Turborepo 项目启动工具 ')
	const border = chalk.cyan('✨'.repeat(title.length / 4))

	console.log(`\n${border}`)
	console.log(title)
	console.log(`${border}\n`)

	try {
		// 获取项目列表
		const spinner = ora({
			text: chalk.blueBright('🔍 正在扫描可用项目...'),
			color: 'blue'
		}).start()

		const projects = await detectProjects()

		if (projects.length <= 1) {
			spinner.warn(chalk.yellowBright('⚠️ 未找到任何项目，请先创建项目'))
			console.log(
				chalk.yellow('\n提示: ') + chalk.greenBright('使用 `pnpm turbo-cli create` 创建新项目\n')
			)
			return
		}

		spinner.succeed(
			chalk.greenBright(`✅ 项目扫描完成，找到 ${chalk.white.bold(projects.length - 1)} 个项目`)
		)

		// 创建选择列表
		const choices = projects.map((project) => ({
			name: `${chalk.greenBright(project.name)} ${chalk.gray(project.description || '')}`,
			value: project
		}))

		// 询问用户选择项目
		const { selectedProject } = await inquirer.prompt([
			{
				type: 'list',
				name: 'selectedProject',
				message: chalk.cyanBright('🚀 请选择要启动的项目:'),
				choices,
				pageSize: 10
			}
		])

		const separator = chalk.gray('─'.repeat(50))
		console.log(`\n${separator}`)
		console.log(`${chalk.cyan('🚀 正在启动:')} ${chalk.whiteBright.bold(selectedProject.name)}`)
		console.log(`${chalk.blue('🔧 执行命令:')} ${chalk.gray(selectedProject.command)}`)
		console.log(`${separator}\n`)

		// 解析命令和参数
		const [cmd, ...args] = selectedProject.command.split(' ')

		// 使用 spawn 启动子进程
		const childProcess = spawn(cmd, args, {
			stdio: 'inherit',
			shell: true
		})

		// 处理子进程退出
		childProcess.on('exit', (code) => {
			childProcess.on('exit', (code) => {
				if (code !== 0 && code !== null) {
					console.error(chalk.redBright(`\n❌ 进程异常退出，退出码: ${code}`))
				}
				process.exit(code || 0)
			})

			// 确保将信号传递给子进程
			const handleTermination = (signal: NodeJS.Signals) => {
				console.log(chalk.yellowBright(`\n⏹️ 接收到${signal}信号，正在优雅关闭...`))
				childProcess.kill(signal)
			}

			process.on('SIGINT', () => handleTermination('SIGINT'))
		})
	} catch (error) {
		// 检查是否是用户中断（Ctrl+C）
		if (error instanceof Error && error.message.includes('User force closed the prompt')) {
			console.log(chalk.yellowBright('\n👋 已取消操作'))
			process.exit(0)
		} else {
			// 其他错误
			console.error(chalk.redBright('\n❌ 发生错误:'), error)
			process.exit(1)
		}
	}
}
