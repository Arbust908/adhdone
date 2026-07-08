<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="text-5xl mb-4">{{ icon }}</div>
    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{{ title }}</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
}>();
</script>
