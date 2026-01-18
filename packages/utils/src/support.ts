const MOBILE_BROWSER_REGEX = /iphone|ipad|ipod|android|blackberry|opera mini|iemobile/i
const MESSENGER_SELECTORS = [
  '.intercom-lightweight-app-launcher',
  '.intercom-launcher-frame',
  '#intercom-container',
  '.intercom-messenger',
  '.intercom-notifications'
]

function StorageSupport(storageType: string): boolean {
  try {
    if (!(storageType in window)) return false
    const storage = window[storageType as keyof Window] as Storage
    return (
      null !== storage &&
      (storage.setItem('intercom-test', '0'), storage.removeItem('intercom-test'), true)
    )
  } catch {
    return false
  }
}

function findNavigator() {
  return navigator || {}
}

function isSafari() {
  const vendor = findNavigator().vendor || ''
  const userAgent = findNavigator().userAgent || ''
  return 0 === vendor.indexOf('Apple') && /\sSafari\//.test(userAgent)
}

function isIOS(userAgent?: string) {
  if (void 0 === userAgent) userAgent = findNavigator().userAgent

  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
}

function findIOSVersion() {
  if (isIOS()) {
    const version = findNavigator().appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/)
    if (version) {
      return {
        major: parseInt(version[1], 10),
        minor: parseInt(version[2], 10),
        patch: parseInt(version[3] || '0', 10)
      }
    }
  }
  return null
}

function isIOS15OrHigher() {
  const version = findIOSVersion()
  return version ? version.major >= 15 : false
}

export const supported = {
  hasXhr2Support: function () {
    return 'XMLHttpRequest' in window && 'withCredentials' in new XMLHttpRequest()
  },
  hasLocalStorageSupport: function () {
    return StorageSupport('localStorage')
  },
  hasSessionStorageSupport: function () {
    return StorageSupport('sessionStorage')
  },
  hasFileSupport: function () {
    return !!(window.FileReader && window.File && window.FileList && window.FormData)
  },
  hasAudioSupport: function () {
    const audio = document.createElement('audio')
    return !!audio.canPlayType && !!audio.canPlayType('audio/mpeg;').replace(/^no$/, '')
  },
  hasVisibilitySupport: function () {
    return void 0 !== document.hidden
  },
  messengerIsVisible: function () {
    return MESSENGER_SELECTORS.some(function (selector) {
      const element = window.parent.document.querySelector(selector)
      if (element) {
        const rect = element.getBoundingClientRect()
        return rect && rect.width > 0 && rect.height > 0
      }
      return false
    })
  },
  messengerHasDisplayNoneSet: function () {
    return MESSENGER_SELECTORS.some(function (selector) {
      const element = window.parent.document.querySelector(selector)
      if (element) {
        const style = window.getComputedStyle(element)
        return null === style || 'none' === style.display
      }
      return false
    })
  },
  isMobileBrowser: function () {
    const userAgent = findNavigator().userAgent
    return !!userAgent && null !== userAgent.match(MOBILE_BROWSER_REGEX) && void 0 !== window.parent
  },
  isIOSFirefox: function () {
    return !!findNavigator().userAgent.match('FxiOS')
  },
  isFirefox: function () {
    return !!findNavigator().userAgent.match('Firefox')
  },
  isSafari: isSafari,
  isElectron: function () {
    const userAgent = findNavigator().userAgent || ''
    const parentWindow = window.parent || {}
    const hasElectronProcess =
      (parentWindow as any).process &&
      (parentWindow as any).versions &&
      (parentWindow as any).versions.electron
    return /\sElectron\//.test(userAgent) || hasElectronProcess
  },
  isIE: function () {
    const userAgent = findNavigator().userAgent || ''
    return userAgent.indexOf('MSIE') > 0 || userAgent.indexOf('Trident') > 0
  },
  isEdge: function () {
    return (findNavigator().userAgent || '').indexOf('Edge') > 0
  },
  isNativeMobile: function () {
    return (findNavigator() as any).isNativeMobile
  },
  isChrome: function () {
    const chrome = (window as any).chrome
    const vendor = findNavigator().vendor
    const userAgent = findNavigator().userAgent
    const isOpera = userAgent.indexOf('OPR') > -1
    const isEdge = userAgent.indexOf('Edge') > -1
    return (
      !!userAgent.match('CriOS') ||
      (null != chrome && 'Google Inc.' === vendor && !isOpera && !isEdge)
    )
  },
  isIOS: isIOS,
  isIOS15Safari: function () {
    const userAgent = findNavigator().userAgent
    const isIOSDevice = isIOS(userAgent)
    const isWebKit = !!userAgent.match(/WebKit/i)
    return isIOSDevice && isWebKit && !userAgent.match(/CriOS/i) && isIOS15OrHigher()
  },
  isAndroid: function (userAgent?: string) {
    if (void 0 === userAgent) userAgent = findNavigator().userAgent
    return userAgent && userAgent.toLowerCase().indexOf('android') > -1
  },
  isMacOS: function () {
    return window.navigator.appVersion.indexOf('Mac') >= 0
  }
}
