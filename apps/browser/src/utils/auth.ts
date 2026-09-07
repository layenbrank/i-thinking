const AUTH_TOKEN_KEY = 'auth-token'

export function findAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(findAuthToken())
}
