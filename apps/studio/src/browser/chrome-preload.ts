import { contextBridge, ipcRenderer } from 'electron'

interface ChromeState {
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

const chromeShell = {
  back() {
    ipcRenderer.send('chrome:back')
  },
  forward() {
    ipcRenderer.send('chrome:forward')
  },
  reload() {
    ipcRenderer.send('chrome:reload')
  },
  navigate(url: string) {
    ipcRenderer.send('chrome:navigate', url)
  },
  onState(callback: (state: ChromeState) => void) {
    function handler(_event: unknown, state: ChromeState) {
      callback(state)
    }
    ipcRenderer.on('chrome:state', handler)
    return function () {
      ipcRenderer.removeListener('chrome:state', handler)
    }
  }
}

contextBridge.exposeInMainWorld('chromeShell', chromeShell)
