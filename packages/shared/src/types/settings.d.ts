interface Settings {
  id: string
  theme: 'light' | 'dark'
  language: string
  notifications: {
    email: boolean
    push: boolean
  }
}
