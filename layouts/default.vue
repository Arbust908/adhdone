<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header class="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">ADHDone</h1>
        <UButton
          icon="i-lucide-settings"
          variant="ghost"
          color="neutral"
          size="sm"
          to="/settings"
          aria-label="Settings"
        />
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
