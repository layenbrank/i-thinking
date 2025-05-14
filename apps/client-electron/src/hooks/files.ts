type FileMonitorCallback = (event: any, ...args: any[]) => void

export function useFileMonitor(callback: FileMonitorCallback) {
  function send(...args: any[]) {
    window.ipcRenderer.send('file:monitor', ...args)
  }

  window.ipcRenderer.on('file:monitor', callback)

  return { send }
}
