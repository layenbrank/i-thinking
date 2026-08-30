import inquirer from 'inquirer'

function hasTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

async function promptSelect<T extends string>(
  message: string,
  choices: ReadonlyArray<{ name: string; value: T }>
): Promise<T> {
  if (!hasTty()) {
    throw new Error(`[prompt] 非交互环境无法提问: ${message}`)
  }
  const answers = await inquirer.prompt<{ value: T }>([
    {
      type: 'list',
      name: 'value',
      message,
      choices: [...choices]
    }
  ])
  return answers.value
}

export { hasTty, promptSelect }
