import { Command, type CommandOptions, type OptionValues } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import figlet from 'figlet'
import { atlas } from 'gradient-string'

import { test } from './commands/test.ts'
import { createApp } from './commands/create.ts'

const program = new Command()

// 定义命令处理函数类型
type CommandHandler = (options: OptionValues) => Promise<void> | void

// 命令处理函数映射
const commandMap: Record<string, CommandHandler> = {
  test,
  create: createApp
  // 可以添加更多命令...
  // build: buildFunction,
}

program
  .description('测试 cmd')
  .version('1.0.0', '-v, --version', '显示版本号')
  .option('-t, --test', '运行测试')
  .option('-c, --create', '创建新项目')
  .helpOption('-h, --help', '显示帮助信息')
  .addHelpText('before', () => {
    try {
      const asciiArt = figlet.textSync('TURBO REPO', {
        font: 'Slant',
        horizontalLayout: 'fitted',
        verticalLayout: 'controlled smushing'
      })

      return `${atlas(asciiArt)}\n\n`
    } catch (error) {
      return chalk.blue.bold('TURBO REPO CLI\n')
    }
  })

  .action(function (options: OptionValues) {
    Object.entries(options).forEach(([key, handler]) => {
      console.log(chalk.blueBright('开始执行命令:', key))
      if (commandMap[key]) {
        commandMap[key](options)
      } else {
        program.help()
      }
    })
  })

// 添加依赖的子命令
program
  .command('add')
  .alias('a')
  .description('添加依赖到项目')
  .action(async () => {
    console.log(chalk.blue('开始添加依赖...'))

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: '选择包管理器：',
        choices: ['npm', 'yarn', 'pnpm'],
        default: 'pnpm'
      },
      {
        type: 'checkbox',
        name: 'dependencies',
        message: '选择要添加的依赖：',
        choices: [
          { name: 'React', value: 'react' },
          { name: 'Vue', value: 'vue' },
          { name: 'TypeScript', value: 'typescript' },
          { name: 'ESLint', value: 'eslint' },
          { name: 'Prettier', value: 'prettier' }
        ]
      },
      {
        type: 'confirm',
        name: 'isDev',
        message: '是否作为开发依赖安装？',
        default: false
      }
    ])

    console.log(chalk.green('依赖配置信息:'), answers)
    // 这里可以添加安装依赖的逻辑
  })

// 生成配置文件的子命令
program
  .command('init-config')
  .alias('ic')
  .description('初始化配置文件')
  .action(async () => {
    console.log(chalk.blue('开始初始化配置文件...'))

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'configFiles',
        message: '选择要生成的配置文件：',
        choices: [
          { name: 'ESLint (.eslintrc.js)', value: 'eslint' },
          { name: 'Prettier (.prettierrc)', value: 'prettier' },
          { name: 'TypeScript (tsconfig.json)', value: 'typescript' },
          { name: 'Jest (jest.config.js)', value: 'jest' },
          { name: 'Webpack (webpack.config.js)', value: 'webpack' }
        ]
      },
      {
        type: 'confirm',
        name: 'overwrite',
        message: '如果文件已存在，是否覆盖？',
        default: false
      }
    ])

    console.log(chalk.green('配置文件信息:'), answers)
    // 这里可以添加生成配置文件的逻辑
  })

// 保留原来的start命令，但简化它
program
  .command('start')
  .description('启动项目')
  .option('-p, --port <port>', '指定端口号')
  .action(async (options) => {
    console.log(chalk.blue('正在启动项目...'))

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: '选择运行环境：',
        choices: ['development', 'production', 'test'],
        default: 'development'
      },
      {
        type: 'confirm',
        name: 'openBrowser',
        message: '是否自动打开浏览器？',
        default: true
      }
    ])

    console.log(chalk.green('启动配置:'), {
      ...options,
      ...answers
    })
    // 这里可以添加启动项目的逻辑
  })

program
  .command('rm <dir...>')
  .option('-r, --recursive', '递归删除目录及其内容')
  .option('-f, --force', '强制删除，不提示确认')
  .option('--verbose', '显示详细删除信息')
  .description('删除目录')
  .action((dirs: string[], options: OptionValues) => {
    // 只提取需要的选项属性，避免循环引用
    const cleanOptions = {
      recursive: options.recursive || false,
      force: options.force || false,
      verbose: options.verbose || false
    }

    console.log('options:', structuredClone(options))
    console.log(`删除选项: ${JSON.stringify(cleanOptions)}`)
    dirs.forEach((dir) => {
      const message = `删除目录: ${dir}${cleanOptions.recursive ? ' (递归)' : ''}${cleanOptions.force ? ' (强制)' : ''}`
      console.log(cleanOptions.verbose ? chalk.yellow(message) : message)
    })
  })

const dev = program.command('dev').description('开发工具')

dev
  .command('build')
  .description('构建开发版本')
  .action(() => {
    /* ... */
  })

dev
  .command('serve')
  .description('启动开发服务器')
  .action(() => {
    /* ... */
  })

// 生产相关命令
const prod = program.command('prod').description('生产工具')

prod
  .command('build')
  .description('构建生产版本')
  .hook('preAction', (thisCommand, actionCommand) => {
    console.log('构建前准备工作...')
  })
  .hook('postAction', (thisCommand, actionCommand) => {
    console.log('构建后清理工作...')
  })
  .action(() => {
    console.log('执行构建...')
  })

// 添加全局的未捕获异常处理
process.on('uncaughtException', (error) => {
  // 检查是否是用户中断（Ctrl+C）
  if (error.message.includes('User force closed the prompt')) {
    console.log(chalk.yellow('\n👋 已取消操作'))
    process.exit(0)
  } else {
    console.error(chalk.red('\n❌ 未捕获的异常:'), chalk.redBright(error))
    process.exit(1)
  }
})

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  const title = chalk.bgCyanBright.black(' Turborepo 项目管理 CLI 工具 ')
  const border = chalk.cyan('✨'.repeat(title.length / 3))

  console.log(`\n${border}`)
  console.log(title)
  console.log(`${border}\n`)

  console.log(chalk.yellow('可用命令:'))
  console.log(`  ${chalk.greenBright('start')}  - ${chalk.cyanBright('选择并启动一个项目')}`)
  console.log(
    `  ${chalk.greenBright('create')} - ${chalk.cyanBright('在 apps 目录下创建一个新项目')}\n`
  )

  console.log(chalk.yellow('示例:'))
  console.log(`  ${chalk.gray('$')} ${chalk.greenBright('pnpm cmd start')}`)
  console.log(`  ${chalk.gray('$')} ${chalk.greenBright('pnpm cmd create')}\n`)
}

program.parse(process.argv)
