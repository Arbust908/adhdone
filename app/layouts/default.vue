<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header class="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">ADHDone</h1>
        <div class="flex items-center gap-1">
          <ClientOnly>
            <UButton
              :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
              @click="toggleColorMode"
            />
            <template #fallback>
              <div class="size-8" />
            </template>
          </ClientOnly>
          <UButton
            icon="i-lucide-settings"
            variant="ghost"
            color="neutral"
            size="sm"
            to="/settings"
            aria-label="Settings"
          />
        </div>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode();

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light'; },
});

function toggleColorMode() {
  isDark.value = !isDark.value;
}
</script>
