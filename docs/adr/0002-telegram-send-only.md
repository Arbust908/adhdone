# Telegram is send-only — no bot commands, no interaction

The Telegram integration only pushes notifications out. Users cannot create, edit, or manage tasks from Telegram — the Nuxt dashboard is the sole management surface.

**Considered Options:**
- Full bot interface (`/newtask`, `/tasks`, `/done`, etc.) — two management surfaces to build and maintain, conversation state handling, input validation across both channels
- Send-only — one surface (dashboard), one source of truth, Telegram is just a delivery channel

**Consequences:**
- No Telegraf needed — a single `fetch()` to `api.telegram.org/bot<TOKEN>/sendMessage` replaces the entire library
- No conversation handlers, no state machines, no command parsing
- If the user is away from their dashboard, they can't mark tasks done — they must wait until they're back at the computer
- The bot doesn't need `bot.launch()` at all — the REST API for sendMessage works independently of long polling
