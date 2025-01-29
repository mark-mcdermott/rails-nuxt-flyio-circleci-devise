// frontend/spec/components/hello.nuxt.spec.ts

import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { Hello } from '#components'

it('can mount some component', async () => {
    const component = await mountSuspended(Hello)
    expect(component.text()).toMatchInlineSnapshot(
        '"Hello from Nuxt!"'
    )
})