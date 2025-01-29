// frontend/nuxt.config.ts

export default defineNuxtConfig({
  modules: ['@nuxt/test-utils/module'],
  server: { port: 3001, host: '0.0.0.0' },
  runtimeConfig: { public: { apiURL: 'http://localhost:3000/api/v1'}},
  $production: { runtimeConfig: { public: { apiURL: 'https://app001-backend.fly.dev/api/v1' }}},
  modules: ['@nuxt/test-utils/module']
})