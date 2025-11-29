import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import TestComponent from './components/Test.vue'

describe('TestComponent', () => {
	it('renders properly', () => {
		const wrapper = mount(TestComponent, { props: { msg: 'Hello Vitest' } })
		expect(wrapper.text()).toContain('Hello Vitest')
	})
})
