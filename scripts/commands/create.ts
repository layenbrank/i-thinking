import { type CommandOptions, type OptionValues } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import { join } from 'node:path'
import { copyFile, mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { exec as execCallback } from 'node:child_process'
import { spawn } from 'node:child_process'

// 项目模板定义
interface Template {
  name: string
  value: string
  description: string
  handler: (options: HandlerOptions) => Promise<void>
}

interface HandlerOptions {
  name: string
  path: string
  templateName: string
}

// 获取项目根目录
const ROOT_DIR = process.cwd()
const APPS_DIR = join(ROOT_DIR, 'apps')
const SCRIPTS_DIR = join(ROOT_DIR, 'scripts')
const TEMPLATES_DIR = join(SCRIPTS_DIR, '/commands/templates')

// 模板创建策略
const TEMPLATE_STRATEGIES = {
  // 使用 Vite 创建项目
  async createWithVite(projectPath: string, template: string) {
    return execCommand(`pnpm create vite ${projectPath} --template ${template}`, { silent: true })
  },

  // 安装依赖
  async installDeps(projectPath: string, deps: string[], isDev = false) {
    const depFlag = isDev ? '-D' : ''
    return execCommand(`pnpm add ${depFlag} ${deps.join(' ')}`, {
      cwd: projectPath,
      silent: true
    })
  }
}

const templates: Template[] = [
  {
    name: 'Vue3',
    value: 'vue3-basic',
    description: 'Vue3 + Vite + TypeScript',
    handler: templateHandler
  },
  {
    name: 'Chrome 扩展',
    value: 'chrome-extension',
    description: 'Chrome 扩展项目 (Vue 3 + TypeScript + Vite)',
    handler: templateHandler
  }
]

async function templateHandler(options: HandlerOptions) {
  // 检查是否存在模板目录
  const { name, path, templateName } = options

  const templatePath = join(TEMPLATES_DIR, templateName)

  let templateExists = false

  try {
    const templateStats = await stat(templatePath)

    templateExists = templateStats.isDirectory()
  } catch (error) {
    // 模板不存在，忽略错误
    console.log(chalk.red('模板不存在，忽略错误'))
  }

  const spinner = ora({
    text: chalk.blueBright('🔨 正在创建 Vue 项目...'),
    color: 'blue'
  }).start()

  try {
    if (!templateExists) {
      // 如果模板不存在，使用 Vite 创建
      await TEMPLATE_STRATEGIES.createWithVite(path, 'vue-ts')
      spinner.succeed(chalk.greenBright('✅ Vue 项目创建成功'))
    } else {
      // 如果模板存在，复制模板
      await copyDirectoryAsync(templatePath, path)
      spinner.succeed(chalk.greenBright('✅ 模板复制成功'))
    }

    // 更新 package.json
    await updatePackageJson(name, path)
  } catch (error) {
    spinner.fail(chalk.redBright('❌ Vue 项目创建失败'))
    console.error(chalk.red('创建项目时出错:'), error)
    throw error
  }
}
/**
 * 异步复制目录
 * @param source 源目录
 * @param destination 目标目录
 */
async function copyDirectoryAsync(source: string, destination: string) {
  // 创建目标目录
  await mkdir(destination, { recursive: true })

  // 读取源目录中的所有文件和子目录
  const entries = await readdir(source, { withFileTypes: true })

  // 使用 Promise.all 并行处理所有文件和目录
  await Promise.all(
    entries.map(async entry => {
      const srcPath = join(source, entry.name)
      const destPath = join(destination, entry.name)

      if (entry.isDirectory()) {
        // 递归复制子目录
        await copyDirectoryAsync(srcPath, destPath)
      } else {
        // 复制文件
        await copyFile(srcPath, destPath)
      }
    })
  )
}

/**
 * 更新 package.json 文件
 * @param projectPath 项目路径
 * @param projectName 项目名称
 */
async function updatePackageJson(name: string, path: string) {
  const packageJsonPath = join(path, 'package.json')

  if (existsSync(packageJsonPath)) {
    const spinner = ora({
      text: chalk.blueBright('📝 正在更新 package.json...'),
      color: 'blue'
    }).start()

    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)

      // 更新项目名称
      packageJson.name = name

      // 添加工作区依赖
      packageJson.dependencies = packageJson.dependencies || {}
      packageJson.devDependencies = packageJson.devDependencies || {}

      // 添加共享依赖
      // packageJson.devDependencies["@repo/eslint-config"] = "workspace:*";
      // packageJson.devDependencies["@repo/typescript-config"] = "workspace:*";

      // 写入更新后的 package.json
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
      spinner.succeed(chalk.greenBright('✅ package.json 更新成功'))
    } catch (error) {
      spinner.fail(chalk.redBright('❌ package.json 更新失败'))
      console.error(chalk.red('更新 package.json 时出错:'), error)
    }
  }
}

/**
 * 执行命令并返回 Promise
 * @param command 要执行的命令
 * @param options 命令选项
 * @returns Promise
 */
function execCommand(
  command: string,
  options: { cwd?: string; silent?: boolean } = {}
): Promise<void> {
  const { cwd = process.cwd(), silent = false } = options

  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const childProcess = spawn(cmd, args, {
      stdio: silent ? 'ignore' : 'inherit',
      shell: true,
      cwd
    })

    childProcess.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })

    childProcess.on('error', err => {
      reject(err)
    })
  })
}

/**
 * @description 更新根目录的 package.json
 * @param appName 项目名称
 */
async function updateRootPackageJson(appName: string) {
  const rootPackageJsonPath = join(ROOT_DIR, 'package.json')

  if (existsSync(rootPackageJsonPath)) {
    const spinner = ora({
      text: chalk.blueBright('📝 正在更新根目录 package.json...'),
      color: 'blue'
    }).start()

    try {
      const packageJsonContent = await readFile(rootPackageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)

      // 添加新项目的 dev 脚本
      if (packageJson.scripts) {
        packageJson.scripts[`dev:${appName}`] = `turbo run dev --filter=${appName}`

        // 写入更新后的 package.json
        await writeFile(rootPackageJsonPath, JSON.stringify(packageJson, null, 2))
        spinner.succeed(chalk.greenBright('✅ 根目录 package.json 更新成功'))
      }
    } catch (error) {
      spinner.fail(chalk.redBright('❌ 根目录 package.json 更新失败'))
      console.error(chalk.red('更新根目录 package.json 时出错:'), error)
    }
  }
}

export async function createApp(options: OptionValues) {
  try {
    // 检查 apps 目录是否存在
    await mkdir(APPS_DIR, { recursive: true })

    const prompt = await inquirer.prompt([
      {
        name: 'appName',
        type: 'input',
        message: chalk.cyanBright('请输入项目名称:'),
        validate(input) {
          if (!input.trim()) return chalk.redBright('项目名称不能为空')

          const appPath = join(APPS_DIR, input.trim())

          if (existsSync(appPath)) {
            return chalk.redBright(`项目 ${chalk.bold(input.trim())} 已存在`)
          }

          return true
        }
      },
      {
        name: 'template',
        type: 'list',
        message: chalk.cyanBright('📋 请选择项目模板:'),
        loop: true,
        default: 'Vue3',
        choices: templates.map(template => ({
          name: `${chalk.greenBright(template.name)} - ${chalk.gray(template.description)}`,
          value: template
        })),
        pageSize: 5
      }
    ])

    // 项目路径
    const appPath = join(APPS_DIR, prompt.appName)
    const appName = prompt.appName.trim()
    const templateName = prompt.template.value

    const separator = chalk.gray('─'.repeat(50))
    console.log(`\n${separator}`)
    console.log(`${chalk.cyan('🚀 创建项目:')} ${chalk.whiteBright.bold(appName)}`)
    console.log(`${chalk.blue('📦 使用模板:')} ${chalk.whiteBright.bold(templateName)}`)
    console.log(`${chalk.blue('📂 项目路径:')} ${chalk.gray(appPath)}`)
    console.log(`${separator}\n`)

    try {
      // 创建项目目录
      await mkdir(appPath, { recursive: true })

      // templateName
      console.log(`${chalk.yellowBright('使用模板:')} ${chalk.whiteBright.bold(templateName)}`)
      // 使用选定的模板设置项目
      await prompt.template.handler({
        name: appName,
        path: appPath,
        templateName
      })

      // 添加到 package.json 中的 dev 脚本
      await updateRootPackageJson(appName)

      const successBox = chalk.bgGreenBright.black(' 项目创建成功! ')
      const successBorder = chalk.green('✨'.repeat(successBox.length / 4))

      console.log(`\n${successBorder}`)
      console.log(successBox)
      console.log(`${successBorder}\n`)

      console.log(chalk.yellowBright('可以使用以下命令启动项目:'))
      console.log(`  ${chalk.gray('$')} ${chalk.greenBright(`pnpm dev:${appName}`)}`)
    } catch (error) {
      const errorBox = chalk.bgRedBright.white(' 项目创建失败! ')
      const errorBorder = chalk.red('✘'.repeat(errorBox.length / 2))

      console.log(`\n${errorBorder}`)
      console.log(errorBox)
      console.log(`${errorBorder}\n`)

      console.error(error)
    }
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
