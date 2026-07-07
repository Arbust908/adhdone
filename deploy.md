# Deploying ADHDone on Dokploy

This guide walks you through deploying ADHDone on your [Dokploy](https://dokploy.com) panel.

## Prerequisites

- A running Dokploy instance
- The ADHDone repo pushed to a Git provider that Dokploy can access
- Three secrets ready to paste in:

  | Variable | Where to get it |
  |---|---|
  | `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/botfather) on Telegram |
  | `OPENROUTER_API_KEY` | [OpenRouter API keys](https://openrouter.ai/keys) |
  | `DASHBOARD_PIN` | A 4-6 digit PIN of your choice |

## Step 1 — Update the Dockerfile

The current `Dockerfile` only copies a pre-built `.output` directory. Dokploy needs to **build from source**, so replace it with a multi-stage build.

**Replace `Dockerfile`** with:

```dockerfile
# ---- Build stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install build-time deps for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/.output .output

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
```

> Without this change, Dokploy would build from the repo which has no `.output/` directory (it's gitignored).

## Step 2 — Create the Application in Dokploy

1. Go to your Dokploy panel → **New Application** → **Git Repository**.
2. Connect your Git provider, select the `adhdone` repo, **Branch** `main`.
3. **Build type:** `Dockerfile` (Dokploy detects it automatically).

## Step 3 — Environment Variables

Under **Environment**, add these three:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `DASHBOARD_PIN` | The PIN you want to log in with |

## Step 4 — Persistent Volume

The app uses SQLite (`/app/data/tasks.db`). Without a volume, data is lost on restart.

Under **Volumes** → **Add Volume**:

| Field | Value |
|---|---|
| **Volume Name** | `adhdone-data` (or any name) |
| **Mount Path** | `/app/data` |
| **Type** | `Volume` |

## Step 5 — Health Check (optional)

Under **Health Check**, set:

- **Type:** `HTTP`
- **Path:** `/api/health`
- **Port:** `3000`

The app has a `GET /api/health` endpoint that returns `200 OK`.

## Step 6 — Deploy

Hit **Deploy**. Dokploy will:

1. Clone the repo
2. Build the Docker image (npm ci → nuxt build → slim runtime image)
3. Start the container on port 3000
4. Run the health check

First deploy takes a minute or two. Subsequent ones are faster thanks to Docker layer caching.

## Step 7 — First-Time Setup

1. Open the app in your browser.
2. Enter your `DASHBOARD_PIN` on the login page.
3. Go to **Settings** (gear icon in the top bar) and configure:
   - **Telegram Chat ID** — send a message to your bot, then check `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` for your chat ID.
   - **Timezone** — so reminders fire at the right hour.
   - **Daily Digest Hour** — default is 09:00.
   - **Reminder Presets** — intervals like "30 min before".

## Domain & SSL

In **Domains**, add your domain. Dokploy's built-in reverse proxy (Traefik) auto-provisions a Let's Encrypt certificate. Point your domain's DNS to your Dokploy server's IP.

## Updating

Push changes to Git → click **Deploy** in Dokploy. It rebuilds the image and replaces the container. The SQLite database on the persistent volume is preserved.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Container keeps restarting | Volume mount path wrong | Mount must be `/app/data` |
| 502 Bad Gateway | App is still starting | Wait 15–30s; check start period |
| Telegram not sending | `TELEGRAM_BOT_TOKEN` missing | Check env var, re-deploy |
| AI enhancement fails | `OPENROUTER_API_KEY` wrong | Verify in Dokploy env |
| Login loop | Wrong PIN | Reset `DASHBOARD_PIN`, re-deploy |
| Module not found | Old single-stage Dockerfile | Switch to multi-stage build above |

Logs are in Dokploy → Application → **Logs**.

## Architecture Notes

| Trait | Detail |
|---|---|
| **Database** | SQLite (`/app/data/tasks.db`) — no external DB needed |
| **SSR** | Disabled — SPA mode, static frontend served by Nitro |
| **Scheduler** | `nuxt-cron` runs reminders every hour |
| **Auth** | SHA-256 hashed PIN in a cookie (30-day sliding expiry) |
| **Backups** | Back up the persistent volume's `tasks.db`. Dokploy supports volume snapshots. |
