import { describe, expect, it } from 'vitest'

// Example utility function test for core package
describe('Example Utility Test', () => {
  it('should process data correctly', () => {
    const processData = (data: string) => data.toUpperCase()
    expect(processData('hello')).toBe('HELLO')
  })

  it('should validate input', () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
  })
})
