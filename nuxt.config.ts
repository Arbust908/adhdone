import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  modules: ['nuxt-cron', '@nuxt/ui', '@pinia/nuxt'],
  cron: {
    runOnInit: false,
    timeZone: 'UTC',
    jobsDir: 'cron',
  },
  css: ['./app/assets/css/main.css'],
  compatibilityDate: '2025-07-07',
  vite: {
    plugins: [tailwindcss()],
  }
});
