import { exit, relaunch } from '@tauri-apps/plugin-process'

async function exitApp(code = 0) {
  await exit(code)
}

async function relaunchApp() {
  await relaunch()
}

export { exitApp, relaunchApp }
