# i-thinking NSIS installer — native Modern UI 2
# Docs: https://nsis.sourceforge.io/Docs/Modern%20UI%202/Readme.html
Unicode true

!include "MUI2.nsh"
!include "LogicLib.nsh"

!define PRODUCT_NAME "i-thinking"
!define PRODUCT_PUBLISHER "i-thinking"
!define PRODUCT_EXE "i-thinking.exe"
!define PRODUCT_VERSION "0.1.0"
!define BRAND_LINK "1A73E8"

Name "${PRODUCT_NAME}"
OutFile "..\build\i-thinking-setup.exe"
InstallDir "$LOCALAPPDATA\${PRODUCT_NAME}"
InstallDirRegKey HKCU "Software\${PRODUCT_NAME}" "InstallDir"
RequestExecutionLevel user
ShowInstDetails show
ShowUnInstDetails show
BrandingText "${PRODUCT_NAME}"
SetCompressor zlib
SetFont "Microsoft YaHei UI" 9

# --- MUI interface (native wizard) ---
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "确定要退出 ${PRODUCT_NAME} 安装程序吗？"

!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_BGCOLOR FFFFFF
!define MUI_TEXTCOLOR 000000

!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"

!define MUI_LICENSEPAGE_CHECKBOX
!define MUI_LICENSEPAGE_CHECKBOX_TEXT "我已阅读并同意上述许可协议"

!define MUI_DIRECTORYPAGE_TEXT_TOP "选择 ${PRODUCT_NAME} 的安装位置。默认安装到当前用户目录，无需管理员权限。"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "安装目录"

!define MUI_INSTFILESPAGE_PROGRESSBAR colored

!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动 ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_LINK "Chromium 开源项目"
!define MUI_FINISHPAGE_LINK_LOCATION "https://www.chromium.org/"
!define MUI_FINISHPAGE_LINK_COLOR ${BRAND_LINK}

# --- Pages (order matters) ---
!define MUI_WELCOMEPAGE_TITLE "欢迎安装 ${PRODUCT_NAME}"
!define MUI_WELCOMEPAGE_TEXT "快捷 · 安全 · 可定制$\r$\n$\r$\n安装程序将引导您完成 ${PRODUCT_NAME} 的安装。$\r$\n$\r$\n点击「下一步」继续。"
!insertmacro MUI_PAGE_WELCOME

!insertmacro MUI_PAGE_LICENSE "license.txt"

!insertmacro MUI_PAGE_COMPONENTS

!insertmacro MUI_PAGE_DIRECTORY

!define MUI_PAGE_HEADER_TEXT "正在安装"
!define MUI_PAGE_HEADER_SUBTEXT "请稍候，正在将 ${PRODUCT_NAME} 安装到您的计算机"
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_TITLE "安装完成"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} 已安装完成。$\r$\n$\r$\n点击「完成」关闭安装程序。"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

# --- Sections ---
Section "${PRODUCT_NAME}" SecCore
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "..\build\runtime\*.*"

  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\${PRODUCT_NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\${PRODUCT_EXE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "NoRepair" 1
SectionEnd

Section "桌面快捷方式" SecDesktop
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
SectionEnd

LangString DESC_SecCore ${LANG_SIMPCHINESE} "安装 ${PRODUCT_NAME} 程序文件（必需）。"
LangString DESC_SecDesktop ${LANG_SIMPCHINESE} "在桌面创建快捷方式。"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\${PRODUCT_NAME}"
SectionEnd