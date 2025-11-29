import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

// Example component test for Vue
describe('Example Component Test', () => {
	it('should render component correctly', () => {
		const TestComponent = {
			template: '<div>Hello World</div>'
		}

		const wrapper = mount(TestComponent)
		expect(wrapper.text()).toBe('Hello World')
	})
})

// Example utility function test
describe('Example Utility Test', () => {
	it('should add two numbers correctly', () => {
		const add = (a: number, b: number) => a + b
		expect(add(2, 3)).toBe(5)
	})
})
