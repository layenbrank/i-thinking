; 对齐 Client `apps/client/src-tauri/nsis/installer-hooks.nsh`：
; 安装/卸载前结束 corex-daemon，避免 Windows 文件占用导致覆盖失败。
; electron-builder NSIS 没有 Tauri 的 KillProcessCurrentUser 插件，用 taskkill + 当前用户过滤。

; 对齐 Client installMode: currentUser —— 不弹出 per-machine 选择
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInit
  DetailPrint "Stopping corex-daemon sidecar…"
  nsExec::ExecToLog 'taskkill /F /IM corex-daemon.exe /T /FI "USERNAME eq %USERNAME%"'
  Sleep 1000
!macroend

!macro customUnInit
  DetailPrint "Stopping corex-daemon sidecar…"
  nsExec::ExecToLog 'taskkill /F /IM corex-daemon.exe /T /FI "USERNAME eq %USERNAME%"'
  Sleep 500
!macroend
