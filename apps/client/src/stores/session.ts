import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type SessionUser = {
  id: string
  username: string
  avatarUrl: string | null
}

type SessionStore = {
  user: SessionUser | null
  toSignIn: (user: SessionUser) => void
  toSignOut: () => void
}

const useSessionStore = create<SessionStore>()(
  devtools(
    function (setters) {
      return {
        user: null,

        toSignIn(user) {
          setters({ user }, false, 'toSignIn')
        },

        toSignOut() {
          setters({ user: null }, false, 'toSignOut')
        }
      }
    },
    {
      name: 'SessionStore',
      enabled: import.meta.env.DEV
    }
  )
)

export { useSessionStore }
export type { SessionUser }
