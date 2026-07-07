export default defineNuxtConfig({
  ssr: false,
  modules: ['nuxt-cron', '@nuxt/ui', '@pinia/nuxt'],
  cron: {
    runOnInit: false,
    timeZone: 'UTC',
    jobsDir: 'cron',
  },
  // Keep Nuxt 3 directory structure (pages/, layouts/, etc. at root)
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  compatibilityDate: '2025-07-07',
});
