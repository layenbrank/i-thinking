import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// Example component test for React
describe('Example Component Test', () => {
  it('should render component correctly', () => {
    // Example test structure
    const TestComponent = () => <div>Hello World</div>

    render(<TestComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})

// Example utility function test
describe('Example Utility Test', () => {
  it('should add two numbers correctly', () => {
    const add = (a: number, b: number) => a + b
    expect(add(2, 3)).toBe(5)
  })
})
