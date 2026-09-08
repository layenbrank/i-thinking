/** 各环境的 baseURL 映射（对应 .env 的 VITE_* 变量） */
const ENV_URLS: Readonly<Record<EnvURL, string>> = {
  engine: import.meta.env.VITE_ENGINE,
  intelligence: import.meta.env.VITE_INTELLIGENCE,
  corex: import.meta.env.VITE_COREX
}

export { ENV_URLS }
