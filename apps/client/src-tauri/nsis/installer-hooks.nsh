; Stop corex-daemon before NSIS copies/deletes files.
; Tauri CheckIfAppIsRunning only covers the main exe; the sidecar holds
; corex-daemon.exe and must be terminated or overwrite fails on Windows.

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Stopping corex-daemon sidecar…"
  nsis_tauri_utils::KillProcessCurrentUser "corex-daemon.exe"
  Pop $R0
  Sleep 1000
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Stopping corex-daemon sidecar…"
  nsis_tauri_utils::KillProcessCurrentUser "corex-daemon.exe"
  Pop $R0
  Sleep 500
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
