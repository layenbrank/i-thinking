import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import { join } from 'node:path'
import { copyFile, mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { exec as execCallback } from 'node:child_process'
import { spawn } from 'node:child_process'

// 将 exec 转换为 Promise 版本
const exec = promisify(execCallback)

// 获取项目根目录
const ROOT_DIR = process.cwd()
const APPS_DIR = join(ROOT_DIR, 'apps')
const TEMPLATES_DIR = join(ROOT_DIR, 'templates')

// 项目模板定义
interface Template {
  name: string
  value: string
  description: string
  setup: (projectName: string, projectPath: string) => Promise<void>
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

// 模板创建策略
const TEMPLATE_STRATEGIES = {
  // 使用 Vite 创建项目
  createWithVite: async (projectPath: string, template: string) => {
    return execCommand(`pnpm create vite ${projectPath} --template ${template}`, { silent: true })
  },

  // 安装依赖
  installDeps: async (projectPath: string, deps: string[], isDev = false) => {
    const depFlag = isDev ? '-D' : ''
    return execCommand(`pnpm add ${depFlag} ${deps.join(' ')}`, {
      cwd: projectPath,
      silent: true
    })
  }
}

// 可用的项目模板
const templates: Template[] = [
  {
    name: 'Vue 基础应用',
    value: 'vue-basic',
    description: '基础的 Vue 3 + TypeScript + Vite 应用',
    setup: async (projectName, projectPath) => {
      // 检查是否存在模板目录
      const templatePath = join(TEMPLATES_DIR, 'vue-basic')
      let templateExists = false

      try {
        const templateStats = await stat(templatePath)
        templateExists = templateStats.isDirectory()
      } catch (error) {
        // 模板不存在，忽略错误
      }

      const spinner = ora({
        text: chalk.blueBright('🔨 正在创建 Vue 项目...'),
        color: 'blue'
      }).start()

      try {
        if (!templateExists) {
          // 如果模板不存在，使用 Vite 创建
          await TEMPLATE_STRATEGIES.createWithVite(projectPath, 'vue-ts')
          spinner.succeed(chalk.greenBright('✅ Vue 项目创建成功'))
        } else {
          // 如果模板存在，复制模板
          await copyDirectoryAsync(templatePath, projectPath)
          spinner.succeed(chalk.greenBright('✅ 模板复制成功'))
        }

        // 更新 package.json
        await updatePackageJson(projectPath, projectName)
      } catch (error) {
        spinner.fail(chalk.redBright('❌ Vue 项目创建失败'))
        console.error(chalk.red('创建项目时出错:'), error)
        throw error
      }
    }
  },
  {
    name: 'Vue 组件库',
    value: 'vue-component-lib',
    description: 'Vue 3 组件库项目',
    setup: async (projectName, projectPath) => {
      // 检查是否存在模板目录
      const templatePath = join(TEMPLATES_DIR, 'vue-component-lib')
      let templateExists = false

      try {
        const templateStats = await stat(templatePath)
        templateExists = templateStats.isDirectory()
      } catch (error) {
        // 模板不存在，忽略错误
      }

      const spinner = ora({
        text: chalk.blueBright('🔨 正在创建 Vue 组件库项目...'),
        color: 'blue'
      }).start()

      try {
        if (!templateExists) {
          // 如果模板不存在，使用 Vite 创建基础项目然后修改
          await TEMPLATE_STRATEGIES.createWithVite(projectPath, 'vue-ts')

          // 添加组件库相关依赖
          await TEMPLATE_STRATEGIES.installDeps(
            projectPath,
            ['vite-plugin-dts', '@vitejs/plugin-vue-jsx'],
            true
          )

          spinner.succeed(chalk.greenBright('✅ Vue 组件库项目创建成功'))
        } else {
          // 如果模板存在，复制模板
          await copyDirectoryAsync(templatePath, projectPath)
          spinner.succeed(chalk.greenBright('✅ 模板复制成功'))
        }

        // 更新 package.json
        await updatePackageJson(projectPath, projectName)
      } catch (error) {
        spinner.fail(chalk.redBright('❌ Vue 组件库项目创建失败'))
        console.error(chalk.red('创建项目时出错:'), error)
        throw error
      }
    }
  },
  {
    name: 'Chrome 扩展',
    value: 'chrome-extension',
    description: 'Chrome 扩展项目 (Vue 3 + TypeScript + Vite)',
    setup: async (projectName, projectPath) => {
      // 检查是否存在模板目录
      const templatePath = join(TEMPLATES_DIR, 'chrome-extension')
      let templateExists = false

      try {
        const templateStats = await stat(templatePath)
        templateExists = templateStats.isDirectory()
      } catch (error) {
        // 模板不存在，忽略错误
      }

      const spinner = ora({
        text: chalk.blueBright('🔨 正在创建 Chrome 扩展项目...'),
        color: 'blue'
      }).start()

      try {
        if (!templateExists) {
          // 如果模板不存在，使用 Vite 创建基础项目然后修改
          await TEMPLATE_STRATEGIES.createWithVite(projectPath, 'vue-ts')

          // 添加 Chrome 扩展相关文件
          await createChromeExtensionFiles(projectPath)
          spinner.succeed(chalk.greenBright('✅ Chrome 扩展项目创建成功'))
        } else {
          // 如果模板存在，复制模板
          await copyDirectoryAsync(templatePath, projectPath)
          spinner.succeed(chalk.greenBright('✅ 模板复制成功'))
        }

        // 更新 package.json
        await updatePackageJson(projectPath, projectName)
      } catch (error) {
        spinner.fail(chalk.redBright('❌ Chrome 扩展项目创建失败'))
        console.error(chalk.red('创建项目时出错:'), error)
        throw error
      }
    }
  }
]

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
async function updatePackageJson(projectPath: string, projectName: string) {
  const packageJsonPath = join(projectPath, 'package.json')

  if (existsSync(packageJsonPath)) {
    const spinner = ora({
      text: chalk.blueBright('📝 正在更新 package.json...'),
      color: 'blue'
    }).start()

    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)

      // 更新项目名称
      packageJson.name = projectName

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
 * 创建 Chrome 扩展相关文件
 * @param projectPath 项目路径
 */
async function createChromeExtensionFiles(projectPath: string) {
  // 创建 manifest.json
  const manifestPath = join(projectPath, 'public', 'manifest.json')
  const manifestContent = {
    manifest_version: 3,
    name: 'Chrome Extension',
    version: '1.0.0',
    description: 'Chrome Extension built with Vue 3 + TypeScript + Vite',
    action: {
      default_popup: 'index.html',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png'
      }
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    },
    permissions: []
  }

  // 确保目录存在
  const publicDir = join(projectPath, 'public')
  await mkdir(publicDir, { recursive: true })

  // 写入 manifest.json
  await writeFile(manifestPath, JSON.stringify(manifestContent, null, 2))

  // 创建图标目录
  const iconsDir = join(projectPath, 'public', 'icons')
  await mkdir(iconsDir, { recursive: true })

  // 创建示例图标文件（这里只是创建空文件，实际应用中应该提供真实的图标）
  await writeFile(join(iconsDir, 'icon16.png'), '')
  await writeFile(join(iconsDir, 'icon48.png'), '')
  await writeFile(join(iconsDir, 'icon128.png'), '')

  // 更新 vite.config.ts
  const viteConfigPath = join(projectPath, 'vite.config.ts')
  if (existsSync(viteConfigPath)) {
    const viteConfigContent = await readFile(viteConfigPath, 'utf-8')
    const updatedConfig = viteConfigContent.replace(
      'export default defineConfig({',
      `export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },`
    )
    await writeFile(viteConfigPath, updatedConfig)
  }
}

/**
 * 创建项目命令
 */
export async function createProject() {
  const title = chalk.bgCyanBright.black(' Turborepo 项目创建工具 ')
  const border = chalk.cyan('✨'.repeat(title.length / 4))

  console.log(`\n${border}`)
  console.log(title)
  console.log(`${border}\n`)

  try {
    // 检查 apps 目录是否存在
    await mkdir(APPS_DIR, { recursive: true })

    // 询问项目名称
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: chalk.cyanBright('🏷️ 请输入项目名称:'),
        validate: (input: string) => {
          if (!input.trim()) {
            return chalk.redBright('项目名称不能为空')
          }

          const projectPath = join(APPS_DIR, input.trim())
          if (existsSync(projectPath)) {
            return chalk.redBright(`项目 ${chalk.bold(input.trim())} 已存在`)
          }

          return true
        }
      }
    ])

    // 询问项目模板
    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: chalk.cyanBright('📋 请选择项目模板:'),
        choices: templates.map(template => ({
          name: `${chalk.greenBright(template.name)} - ${chalk.gray(template.description)}`,
          value: template
        })),
        pageSize: 10
      }
    ])

    // 项目路径
    const projectPath = join(APPS_DIR, projectName)

    const separator = chalk.gray('─'.repeat(50))
    console.log(`\n${separator}`)
    console.log(`${chalk.cyan('🚀 创建项目:')} ${chalk.whiteBright.bold(projectName)}`)
    console.log(`${chalk.blue('📦 使用模板:')} ${chalk.whiteBright.bold(template.name)}`)
    console.log(`${chalk.blue('📂 项目路径:')} ${chalk.gray(projectPath)}`)
    console.log(`${separator}\n`)

    try {
      // 创建项目目录
      await mkdir(projectPath, { recursive: true })

      // 使用选定的模板设置项目
      await template.setup(projectName, projectPath)

      // 添加到 package.json 中的 dev 脚本
      await updateRootPackageJson(projectName)

      const successBox = chalk.bgGreenBright.black(' 项目创建成功! ')
      const successBorder = chalk.green('✨'.repeat(successBox.length / 4))

      console.log(`\n${successBorder}`)
      console.log(successBox)
      console.log(`${successBorder}\n`)

      console.log(chalk.yellowBright('可以使用以下命令启动项目:'))
      console.log(`  ${chalk.gray('$')} ${chalk.greenBright(`pnpm dev:${projectName}`)}`)
      console.log(
        `  ${chalk.gray('$')} ${chalk.greenBright('pnpm dev:select')} ${chalk.gray('(然后选择项目)')}\n`
      )
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

/**
 * 更新根目录的 package.json
 * @param projectName 项目名称
 */
async function updateRootPackageJson(projectName: string) {
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
        packageJson.scripts[`dev:${projectName}`] = `turbo run dev --filter=${projectName}`

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
