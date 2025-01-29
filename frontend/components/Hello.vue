<!--- frontend/components/Hello.vue -->

<template>
  <p data-testid="backend-message">{{ message }}</p>
  <p data-testid="frontend-message">Hello from Nuxt!</p>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const runtimeConfig = useRuntimeConfig()
const message = ref('');

onMounted(async () => {
  const response = await fetch(`${runtimeConfig.public.apiURL}/hello`);
  const data = await response.json();
  message.value = data.message;
});
</script>