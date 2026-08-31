const READY_TIMEOUT_MS = 15_000
const INVOKE_TIMEOUT_MS = 60_000
const STOP_TIMEOUT_MS = 3_000
const PING_INTERVAL_MS = 200

const COREX_CLI = 'corex'
const COREX_DAEMON = 'corex-daemon'
const PANDOC_BINARY = 'pandoc'

/** Corex 官方默认 Windows named pipe（`ipc_endpoint`）；可用 COREX_SOCKET 覆盖。 */
const COREX_PIPE = String.raw`\\.\pipe\corex`
const COREX_SOCKET_ENV = 'COREX_SOCKET'
const COREX_TOKEN_ENV = 'COREX_TOKEN'

export {
  COREX_CLI,
  COREX_DAEMON,
  COREX_PIPE,
  COREX_SOCKET_ENV,
  COREX_TOKEN_ENV,
  INVOKE_TIMEOUT_MS,
  PANDOC_BINARY,
  PING_INTERVAL_MS,
  READY_TIMEOUT_MS,
  STOP_TIMEOUT_MS
}
