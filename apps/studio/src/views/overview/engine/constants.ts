interface SearchEngine {
  key: string
  label: string
  icon: string
  origin: string
  match: string
}

const ENGINE_STORE_KEY = 'overview.engine'

const ENGINES: readonly SearchEngine[] = [
  {
    key: 'bing',
    label: '必应',
    icon: 'mdi:microsoft-bing',
    origin: 'https://cn.bing.com',
    match: 'https://cn.bing.com/search?q='
  },
  {
    key: 'baidu',
    label: '百度',
    icon: 'mdi:alpha-b-box',
    origin: 'https://www.baidu.com',
    match: 'https://www.baidu.com/s?wd='
  },
  {
    key: 'google',
    label: 'Google',
    icon: 'mdi:google',
    origin: 'https://www.google.com',
    match: 'https://www.google.com/search?q='
  }
]

const ENGINE_UI = {
  PRIVATE_USE_CHARS: /[\uE000-\uF8FF]/g,
  URL_PATTERN:
    /^(?:https?:\/\/)?(?:localhost|(?:[\w-]+\.)+[a-z]{2,})(?::\d{1,5})?(?:[/?#][^\s]*)?$/i,
  NAVIGATE_THROTTLE_MS: 150,
  NONE: -1,
  SUGGEST_WAIT_MS: 300
} as const

function findEngine(key: string): SearchEngine {
  return ENGINES.find(function (engine) {
    return engine.key === key
  }) ?? ENGINES[0]
}

export type { SearchEngine }
export { ENGINE_STORE_KEY, ENGINE_UI, ENGINES, findEngine }
