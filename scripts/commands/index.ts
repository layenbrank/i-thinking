#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'

import { startProject } from './start.ts'
import { createApp } from './create.ts'

// 命令映射策略
const COMMAND_HANDLERS = {
  start: {
    description: '选择并启动一个项目',
    action: startProject
  },
  create: {
    description: '在 apps 目录下创建一个新项目',
    action: createApp
  }
}

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

// 创建程序实例
const program = new Command()

// 设置版本和描述
program
  .name(chalk.blueBright('turbo-cli'))
  .description(chalk.cyanBright('Turborepo 项目管理 CLI 工具'))
  .version(chalk.greenBright('1.0.0'))

// 动态注册所有命令
Object.entries(COMMAND_HANDLERS).forEach(([name, { description, action }]) => {
  program
    .command(name) // 移除颜色处理，保持原始命令名
    .description(chalk.cyanBright(description))
    .action(action)
})

// 解析命令行参数
program.parse(process.argv)

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
