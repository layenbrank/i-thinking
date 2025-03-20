#!/usr/bin/env node

import { Command, type CommandOptions, type OptionValues } from 'commander'
import figlet from 'figlet'
import { atlas } from 'gradient-string'

import chalk from 'chalk'

import { startProject } from './start.ts'
import { createApp } from './create.ts'

// 定义命令处理函数类型
type CommandHandler = (options: OptionValues) => Promise<void> | void
type CommandHandlerMap = Readonly<Record<string, CommandHandler>>

// 命令处理函数映射
const commandMap: CommandHandlerMap = {
  create: createApp
  // 可以添加更多命令...
  // build: buildFunction,
}

// 创建程序实例
const program = new Command()

// 设置版本和描述
program
  .name(chalk.blueBright('turbo-cli'))
  .description(chalk.cyanBright('Turborepo 项目管理 CLI 工具'))
  .version('1.0.0', '-v, --version', '查看版本号')
  .option('-t, --test', '运行测试')
  .option('-c, --create', '创建新项目')
  .helpOption('-h, --help', '显示帮助信息')
  .addHelpText('before', function () {
    try {
      const asciiArt = figlet.textSync('TURBO REPO', {
        font: 'Slant',
        horizontalLayout: 'fitted',
        verticalLayout: 'controlled smushing'
      })

      return `${atlas(asciiArt)}\n\n`
    } catch (error) {
      return chalk.blueBright.bold('TURBO REPO CLI\n')
    }
  })
  .action(function (options: OptionValues) {
    Object.keys(options).forEach(function (key) {
      if (commandMap[key]) commandMap[key](options)
      else program.help()
    })
  })

// 添加全局的未捕获异常处理
process.on('uncaughtException', (error) => {
  // 检查是否是用户中断（Ctrl+C）
  if (error.message.includes('User force closed the prompt')) {
    console.log(chalk.yellowBright('\n👋 已取消操作'))
    process.exit(0)
  } else {
    console.error(chalk.red('\n❌ 未捕获的异常:'), chalk.redBright(error))
    process.exit(1)
  }
})

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  const title = chalk.bgCyanBright.black(' Turborepo 项目管理 CLI 工具 ')
  const border = chalk.cyan('✨'.repeat(title.length / 4))

  console.log(`\n${border}`)
  console.log(title)
  console.log(`${border}\n`)

  console.log(chalk.yellow('可用命令:'))
  console.log(`  ${chalk.greenBright('start')}  - ${chalk.cyanBright('选择并启动一个项目')}`)
  console.log(
    `  ${chalk.greenBright('create')} - ${chalk.cyanBright('在 apps 目录下创建一个新项目')}\n`
  )

  console.log(chalk.yellow('示例:'))
  console.log(`  ${chalk.gray('$')} ${chalk.greenBright('pnpm turbo-cli start')}`)
  console.log(`  ${chalk.gray('$')} ${chalk.greenBright('pnpm turbo-cli create')}\n`)
}

// 解析命令行参数
program.parse(process.argv)
