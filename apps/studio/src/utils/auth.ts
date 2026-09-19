const AUTH_TOKEN_KEY = 'auth-token'

function findAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY)
}

/** 记住我进 localStorage，否则只留到这次会话结束 */
function writeAuthToken(token: string, isRemembered: boolean): void {
  const keep = isRemembered ? localStorage : sessionStorage
  const drop = isRemembered ? sessionStorage : localStorage
  drop.removeItem(AUTH_TOKEN_KEY)
  keep.setItem(AUTH_TOKEN_KEY, token)
}

function isAuthenticated(): boolean {
  return Boolean(findAuthToken())
}

export { findAuthToken, isAuthenticated, writeAuthToken }
