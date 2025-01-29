// frontend/spec/components/hello.nuxt.spec.ts

import { it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { Hello } from '#components'

global.fetch = vi.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ message: 'Hello from Rails!' }),
    })
)

it('can mount some component', async () => {
    const component = await mountSuspended(Hello)
    expect(component.html()).toMatchInlineSnapshot(`
        "<p data-testid="backend-message">Hello from Rails!</p>
        <p data-testid="frontend-message">Hello from Nuxt!</p>"
      `)
})