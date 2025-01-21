// frontend/spec/components/Hello.nuxt.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils' 
import Hello from './../../components/Hello.vue'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({ message: 'Hello from Rails!' })
}));

describe('Hello', () => {
  it('component renders frontend message properly', async () => {
    const wrapper = mount(Hello) 
    expect(wrapper.text()).toContain('Hello from Nuxt!')
  })
  it('component renders backend message properly', async () => {
    const wrapper = mount(Hello)
    await flushPromises()   
    expect(wrapper.text()).toContain('Hello from Rails!')
  })
})