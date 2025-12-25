export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APPDATA: string
      HOME: string
      HOMEDRIVE: string
      HOMEPATH: string
      LOCALAPPDATA: string
      ProgramData: string
      ProgramFiles: string
      ProgramW6432: string
      PUBLIC: string
      SystemDrive: string
      SystemRoot: string
      USERNAME: string
      USERPROFILE: string
      windir: string
    }
  }
}
