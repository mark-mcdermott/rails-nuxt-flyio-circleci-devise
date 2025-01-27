/// frontend/vitest.config.ts

import { defineVitestConfig } from '@nuxt/test-utils/config'
export default defineVitestConfig({
  test: {
    include: ['spec/components/**/*.spec.ts'], // Only component tests
    exclude: ['spec/e2e/**/*'], // Exclude e2e tests
  },
})