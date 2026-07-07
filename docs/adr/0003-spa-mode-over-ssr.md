# SPA mode for a personal dashboard, not SSR

Nuxt defaults to universal SSR. We explicitly set `ssr: false` in nuxt.config.ts (SPA mode). The app is a personal tool behind a PIN gate — no SEO, no public users, no first-paint performance concerns.

**Considered Options:**
- SSR (Nuxt default) — pages render on the server first, hydrate on the client. Adds complexity: hydration mismatches, server-side `localStorage` errors, `document` access issues
- SPA mode — entire Vue app is client-rendered, API routes still run on the Nitro server, simpler mental model

**Consequences:**
- The Nitro server still runs: API routes, cron jobs, and the auth middleware are unaffected
- Only the Vue rendering moves to the client
- Initial page load is slightly slower (client must download and render the Vue app), but for a local/VPS dashboard this is imperceptible
- Can be toggled back to SSR with a single config change if needed
