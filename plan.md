# ADHDone — End-to-End Build Plan

A personal to-do dashboard with AI-enhanced task descriptions and Telegram notifications.
Built with Nuxt 3 (SPA mode), SQLite + Drizzle ORM, OpenRouter (DeepSeek), and nuxt-cron.

---

## 1. Tech Stack

| Layer          | Choice                          |
|----------------|---------------------------------|
| Frontend       | Nuxt 3 (Vue 3, SPA mode)       |
| Backend        | Nitro (built-in Nuxt server)    |
| Database       | SQLite (better-sqlite3)         |
| ORM            | Drizzle ORM (`better-sqlite3` driver) |
| Migrations     | drizzle-kit, auto-migrate on startup |
| Scheduler      | nuxt-cron (`everyHour` preset)   |
| AI             | OpenRouter → DeepSeek-V3        |
| Notifications  | Telegram Bot (send-only, raw HTTP fetch) |
| UI             | Nuxt UI v4                      |
| State          | Pinia (one store per entity)    |
| Auth           | PIN gate (SHA-256 hashed cookie, 30-day sliding) |

---

## 2. Project Structure

```
adhdone/
├── server/
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── index.get.ts          # list tasks (?show=finished)
│   │   │   ├── index.post.ts         # create task
│   │   │   └── [id].patch.ts         # update task (edit, mark done/undone)
│   │   ├── ai/
│   │   │   ├── ask.post.ts           # get clarifying questions
│   │   │   └── enhance.post.ts       # generate enriched title + description
│   │   ├── settings.get.ts           # read settings row
│   │   ├── settings.patch.ts         # update settings row
│   │   ├── logs.get.ts               # recent notification error logs
│   │   ├── auth.post.ts              # validate PIN, set cookie
│   │   ├── telegram-test.post.ts     # send test notification
│   │   └── health.get.ts             # health check
│   ├── cron/
│   │   └── reminders.ts              # nuxt-cron hourly job
│   ├── db/
│   │   ├── index.ts                  # drizzle client
│   │   └── schema.ts                 # table definitions
│   ├── services/
│   │   ├── ai.ts                     # OpenRouter calls (ask + enhance)
│   │   └── telegram.ts              # send-message utility (fetch to Bot API)
│   └── plugins/
│       └── migrate.ts                # auto-migrate on startup
├── pages/
│   ├── index.vue                     # dashboard
│   ├── login.vue                     # PIN gate (layout: false)
│   └── settings.vue                  # user settings + logs
├── components/
│   ├── TaskCard.vue                  # single task card (checkbox, title, badges)
│   ├── TaskFormModal.vue             # create/edit modal with all fields
│   ├── AiEnhanceModal.vue            # nested modal: ask → answer → preview → apply
│   └── EmptyState.vue                # "create first task" or "all done!"
├── stores/
│   ├── useTaskStore.ts               # tasks CRUD + optimistic updates
│   └── useSettingsStore.ts           # settings fetch + update
├── middleware/
│   └── auth.ts                       # server-side PIN check (all routes except /login, /api/auth)
├── layouts/
│   └── default.vue                   # top bar (app name, settings gear)
├── data/                             # SQLite file lives here (bind mount)
├── .env
├── drizzle.config.ts
├── nuxt.config.ts
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 3. Data Model (Drizzle / SQLite)

```typescript
// server/db/schema.ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  chatId: integer('chat_id'),
  timezone: text('timezone').default('UTC'),
  dailyDigestHour: integer('daily_digest_hour').default(9),
  aiModel: text('ai_model').default('deepseek/deepseek-chat'),
  reminderPresets: text('reminder_presets').default(
    '[{"label":"15 minutes before","minutes":15},{"label":"30 minutes before","minutes":30},{"label":"1 hour before","minutes":60},{"label":"2 hours before","minutes":120},{"label":"1 day before","minutes":1440},{"label":"2 days before","minutes":2880},{"label":"1 week before","minutes":10080}]'
  ),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').default(''),
  deadline: text('deadline'),                          // ISO datetime, nullable
  reminderOffsets: text('reminder_offsets').default('[]'), // JSON array of minutes
  recurringCron: text('recurring_cron'),               // cron string, nullable
  lastNotified: text('last_notified'),                 // for recurring dedup
  finishedAt: text('finished_at'),                     // NULL = pending, non-null = done
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const notificationLogs = sqliteTable('notification_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id'),                          // nullable (digests have no specific task)
  eventType: text('event_type').notNull(),             // 'daily_digest' | 'deadline_reminder' | 'recurring_reminder' | 'ai_enhance'
  errorMessage: text('error_message').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

**Key design decisions:**
- No `chat_id` on tasks — single user, `chat_id` lives in `settings`
- No `task_type` column — a task can have `deadline`, `recurring_cron`, both, or neither
- No `status` column — `finished_at IS NULL` means pending, non-null means done
- No delete — `finished_at` is the only completion mechanism; tasks stay forever
- `reminder_offsets` stores raw minute values — presets are just a UI convenience

---

## 4. API Routes

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/api/tasks` | List tasks (`?show=finished` or `?show=pending`) | PIN |
| `POST` | `/api/tasks` | Create task (title required, rest optional) | PIN |
| `PATCH` | `/api/tasks/[id]` | Update task fields, toggle `finished_at` | PIN |
| `POST` | `/api/ai/ask` | Get clarifying questions (`{ title, description? }`) | PIN |
| `POST` | `/api/ai/enhance` | Generate enriched task (`{ title, description, answers }`) | PIN |
| `GET` | `/api/settings` | Read settings row | PIN |
| `PATCH` | `/api/settings` | Update settings (partial: any subset of fields) | PIN |
| `GET` | `/api/logs` | Recent error logs (`?limit=50`) | PIN |
| `POST` | `/api/auth` | Validate PIN, set auth cookie | None |
| `POST` | `/api/telegram-test` | Send test notification to configured `chat_id` | PIN |
| `GET` | `/api/health` | Health check (`{ status: "ok", timestamp }`) | None |

**Validation:** Both client-side (disable Save, show inline error) and server-side (400 on empty title).

**No `GET /api/tasks/[id]`** — the dashboard list fetches all tasks; the edit modal uses the already-fetched object.

---

## 5. AI Integration (OpenRouter / DeepSeek)

Two-step flow via a nested modal:

### Step 1: Ask (`POST /api/ai/ask`)

User clicks "Enhance with AI" → calls OpenRouter to generate 2–3 clarifying questions.

```typescript
// server/services/ai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'ADHDone',
  },
});

export async function getClarifyingQuestions(title: string, description?: string) {
  const model = process.env.AI_MODEL || 'deepseek/deepseek-chat';
  const taskText = description ? `Title: ${title}\nDescription: ${description}` : title;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a task assistant. Given a task (title and optional description), ask up to 3 concise clarifying questions to turn it into a well-defined, actionable task. Focus on necessary steps, details, context, or resources — never ask about deadlines or scheduling. Reply with a JSON object containing an array field "clarifyingQuestions".`,
      },
      { role: 'user', content: taskText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content!;
  return JSON.parse(content).clarifyingQuestions as string[];
}
```

### Step 2: Enhance (`POST /api/ai/enhance`)

User answers the questions → calls OpenRouter to generate enriched title + description.

```typescript
export async function enhanceTask(
  title: string,
  description: string | undefined,
  userAnswers: string
): Promise<{ title: string; description: string }> {
  const model = process.env.AI_MODEL || 'deepseek/deepseek-chat';
  const taskText = description
    ? `Title: ${title}\nDescription: ${description}`
    : `Title: ${title}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a task assistant. Given an original task and the user's answers to clarifying questions, produce a final enriched version. Output a JSON object with:
- "title": a concise task title (max 10 words).
- "description": a detailed, actionable description incorporating the user's answers.
Do NOT include any deadlines, dates, or scheduling information. Only the title and description.`,
      },
      {
        role: 'user',
        content: `Original task:\n${taskText}\n\nUser's answers to clarifying questions:\n${userAnswers}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content!);
}
```

**UI flow (nested modal):**
1. Click "Enhance with AI" → nested modal opens
2. Spinner: "Asking clarifying questions..." → `/api/ai/ask`
3. Questions appear in the modal with a textarea for answers
4. User types answers, clicks "Generate"
5. Spinner: "Generating enhanced task..." → `/api/ai/enhance`
6. **Editable preview:** old values in red, new values in black (inputs, editable)
7. "Apply" → populates parent form | "Retry" → calls enhance again | "Back" → return to answers step
8. On failure: error toast, modal stays open with answers preserved

---

## 6. Scheduler (nuxt-cron, everyHour)

```typescript
// server/cron/reminders.ts
import { defineCronHandler } from '#nuxt/cron';
import { db, schema } from '../db';
import { eq, isNull } from 'drizzle-orm';
import { sendTelegramMessage } from '../services/telegram';
import moment from 'moment-timezone';
import cronParser from 'cron-parser';

// Cached settings, refreshed on settings update
let cachedSettings: typeof schema.settings.$inferSelect | null = null;
let settingsWarned = false;

export async function refreshSettings() {
  cachedSettings = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
}

export default defineCronHandler('everyHour', async () => {
  if (!cachedSettings) await refreshSettings();
  if (!cachedSettings?.chatId) {
    if (!settingsWarned) {
      console.warn('Scheduler skipped: chat_id not configured');
      db.insert(schema.notificationLogs).values({
        eventType: 'daily_digest',
        errorMessage: 'chat_id not configured in settings',
      });
      settingsWarned = true;
    }
    return;
  }
  settingsWarned = false;

  const now = moment().tz(cachedSettings.timezone);
  const currentHour = now.hour();
  const currentDate = now.format('YYYY-MM-DD');

  // 1. Daily Digest (9am default)
  if (currentHour === cachedSettings.dailyDigestHour) {
    const pendingTasks = db.select()
      .from(schema.tasks)
      .where(isNull(schema.tasks.finishedAt))
      .all();

    if (pendingTasks.length > 0) {
      const message = formatDigest(pendingTasks, now);
      try {
        await sendTelegramMessage(cachedSettings.chatId, message);
      } catch (err: any) {
        console.error('Daily digest failed:', err);
        logError(null, 'daily_digest', err.message);
      }
    }
  }

  // 2. Deadline Reminders
  const deadlineTasks = db.select()
    .from(schema.tasks)
    .where(isNull(schema.tasks.finishedAt))
    .all()
    .filter(t => t.deadline);

  for (const task of deadlineTasks) {
    const offsets: number[] = JSON.parse(task.reminderOffsets || '[]');
    for (const offsetMin of offsets) {
      const reminderTime = moment(task.deadline!).subtract(offsetMin, 'minutes');
      if (reminderTime.format('YYYY-MM-DD') === currentDate && reminderTime.hour() === currentHour) {
        try {
          await sendTelegramMessage(
            cachedSettings.chatId,
            `⏰ Reminder: "${task.title}" in ~${Math.round(offsetMin / 60)} hour(s)`
          );
        } catch (err: any) {
          logError(task.id, 'deadline_reminder', err.message);
        }
        break; // one reminder per task per hour
      }
    }
  }

  // 3. Recurring reminders
  const recurringTasks = db.select()
    .from(schema.tasks)
    .where(isNull(schema.tasks.finishedAt))
    .all()
    .filter(t => t.recurringCron);

  for (const task of recurringTasks) {
    const interval = cronParser.parseExpression(task.recurringCron!);
    const prev = interval.prev().toDate();
    const nowDate = now.toDate();

    if (prev.getTime() > nowDate.getTime() - 3_600_000) {
      const last = task.lastNotified ? new Date(task.lastNotified).getTime() : 0;
      if (nowDate.getTime() - last > 3_600_000) {
        // Auto-reset: clear finished_at before sending nudge
        if (task.finishedAt) {
          db.update(schema.tasks)
            .set({ finishedAt: null })
            .where(eq(schema.tasks.id, task.id))
            .run();
        }
        try {
          await sendTelegramMessage(cachedSettings.chatId, `🔄 Did you "${task.title}"?`);
          db.update(schema.tasks)
            .set({ lastNotified: now.toISOString() })
            .where(eq(schema.tasks.id, task.id))
            .run();
        } catch (err: any) {
          logError(task.id, 'recurring_reminder', err.message);
        }
      }
    }
  }
});

function formatDigest(tasks: any[], now: moment.Moment): string {
  const overdue: any[] = [];
  const dueToday: any[] = [];
  const dueThisWeek: any[] = [];
  const recurring: any[] = [];
  const noDeadline: any[] = [];

  for (const t of tasks) {
    if (t.deadline) {
      const dl = moment(t.deadline);
      if (dl.isBefore(now)) overdue.push(t);
      else if (dl.isBefore(now.endOf('day'))) dueToday.push(t);
      else if (dl.isBefore(now.clone().add(7, 'days'))) dueThisWeek.push(t);
      else if (t.recurringCron) recurring.push(t);
      else noDeadline.push(t);
    } else if (t.recurringCron) {
      recurring.push(t);
    } else {
      noDeadline.push(t);
    }
  }

  const sections: string[] = [];
  if (overdue.length) sections.push(`⚠️ Overdue:\n${overdue.map(t => `• ${t.title}`).join('\n')}`);
  if (dueToday.length) sections.push(`📅 Due today:\n${dueToday.map(t => `• ${t.title}`).join('\n')}`);
  if (dueThisWeek.length) sections.push(`📆 Due this week:\n${dueThisWeek.map(t => `• ${t.title}`).join('\n')}`);
  if (recurring.length) sections.push(`🔄 Recurring:\n${recurring.map(t => `• ${t.title}`).join('\n')}`);
  if (noDeadline.length) sections.push(`📋 No deadline:\n${noDeadline.map(t => `• ${t.title}`).join('\n')}`);

  return `📋 Daily tasks:\n\n${sections.join('\n\n')}`;
}

function logError(taskId: number | null, eventType: string, errorMessage: string) {
  db.insert(schema.notificationLogs).values({ taskId, eventType, errorMessage }).run();
}
```

**Key behaviors:**
- Runs at minute 0 of every hour
- Settings cached in module variable; `refreshSettings()` called by settings PATCH API
- Scheduler silently skips if `chat_id` is null (logs one warning)
- Deadline reminders rounded to the hour: if `deadline - offset` falls in the current hour, send
- Recurring tasks auto-reset: `finished_at = NULL` before sending nudge
- All send failures caught, logged to `notification_logs`, execution continues

---

## 7. Telegram Notifications

Send-only via raw HTTP fetch (no Telegraf dependency):

```typescript
// server/services/telegram.ts
export async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ description: res.statusText }));
    throw new Error(`Telegram send failed: ${(err as any).description || res.statusText}`);
  }
}
```

---

## 8. Auth (PIN Gate)

**Middleware:** Server-side Nitro middleware on all routes except `/login` and `/api/auth` and `/api/health`.

```typescript
// server/middleware/auth.ts
import { createHash } from 'crypto';

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (path === '/login' || path === '/api/auth' || path === '/api/health') return;

  const cookie = getCookie(event, 'adhdone_auth');
  const pinHash = createHash('sha256').update(process.env.DASHBOARD_PIN || '').digest('hex');

  if (cookie !== pinHash) {
    if (path.startsWith('/api/')) {
      throw createError({ statusCode: 401, message: 'Unauthorized' });
    }
    return sendRedirect(event, '/login');
  }
});
```

**Login API:**
```typescript
// server/api/auth.post.ts
import { createHash } from 'crypto';

export default defineEventHandler(async (event) => {
  const { pin } = await readBody(event);
  const expectedHash = createHash('sha256').update(process.env.DASHBOARD_PIN || '').digest('hex');
  const providedHash = createHash('sha256').update(pin || '').digest('hex');

  if (providedHash !== expectedHash) {
    throw createError({ statusCode: 401, message: 'Invalid PIN' });
  }

  setCookie(event, 'adhdone_auth', expectedHash, {
    httpOnly: true,
    secure: false,            // local/VPS use
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return { success: true };
});
```

**Login page (`pages/login.vue`):** Full-page minimal — PIN input + "Sign in" button. `definePageMeta({ layout: false })`. Input auto-focused on load.

**Sliding expiration:** The cookie maxAge resets on each successful request (via middleware re-issuing the cookie or setting `maxAge` on each check).

---

## 9. Frontend

### 9a. Dashboard (`pages/index.vue`)

- Top bar: "ADHDone" title, "New Task" button, pending/finished tabs, settings gear icon
- Task cards: checkbox (toggle `finished_at`), title, deadline badge (blue=upcoming, amber=soon, red=overdue), 🔄 icon if recurring
- Click card → TaskFormModal (edit mode)
- Click "New Task" → TaskFormModal (create mode)
- Filter: "Pending" (default) | "Finished" tabs
- Empty states:
  - Zero tasks total → "Create your first task" + big CTA button
  - Has tasks, zero pending → "All done! 🎉" + link to finished tab
- Sort: deadline ascending (nulls last), then `created_at` descending

### 9b. TaskFormModal (`components/TaskFormModal.vue`)

**Create mode** — empty fields, modal titled "New Task"
**Edit mode** — pre-filled fields, modal titled "Edit Task." If task was finished, shows banner: "This task was completed. Editing will reopen it."

Fields:
- **Title** (required, text input, auto-focused)
- **Description** (optional, textarea)
- **"Enhance with AI" button** — always visible, opens AiEnhanceModal
- **Collapsible "📅 Add deadline"** — datetime-local input (default time 23:59)
- **Collapsible "🔔 Set reminders"** — checkboxes from `settings.reminder_presets` (label only)
- **Collapsible "🔄 Make recurring"** — day checkboxes (Mon–Sun) with shortcut buttons (All, Weekdays, Weekends), hour dropdown (12am–11pm)

**Save button** — calls create or update API
**Cancel / close** — confirmation dialog if form is dirty (including if AI was applied)

When editing a finished task: banner "This task was completed. Editing will reopen it." — user can choose to keep it finished.

### 9c. AiEnhanceModal (`components/AiEnhanceModal.vue`)

Nested modal (opens on top of TaskFormModal).

Steps:
1. **Loading:** "Asking clarifying questions..." spinner → `POST /api/ai/ask`
2. **Questions:** rendered list + textarea for answers + "Generate" button
3. **Loading:** "Generating enhanced task..." spinner → `POST /api/ai/enhance`
4. **Preview:** old title/description in red (read-only), new title/description in black (editable inputs)
5. **Actions:** "Apply" (populate parent form) | "Retry" (re-submit answers) | "Back" (return to answers step)

On failure at any step: error toast, modal stays open, answers preserved.

### 9d. Settings (`pages/settings.vue`)

Sectioned single form:

**General**
- Timezone (dropdown, e.g., `America/New_York`)
- Daily digest hour (dropdown 0–23, AM/PM labels)

**Telegram**
- Chat ID (number input)
- "Send test notification" button → `POST /api/telegram-test`

**AI**
- Model (hardcoded dropdown: DeepSeek-V3, DeepSeek-R1, GPT-4o Mini, Claude 3.5 Haiku, Llama 4 Maverick)

**Reminder Presets**
- List of presets (label + minutes), each with edit/delete icons
- "Add preset" button → inline row with label text input + minutes number input
- Changes to the array are local until "Save" is clicked

**Notification Log**
- Read-only section at the bottom
- Compact list: timestamp, event type badge, error message
- Shows last 50 entries from `notification_logs`

One "Save" button at the bottom persists all editable fields (not the log, not the test button).

### 9e. Pinia Stores

**`useTaskStore`:**
```typescript
// stores/useTaskStore.ts
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const filter = ref<'pending' | 'finished'>('pending');
  const isLoading = ref(false);

  const filteredTasks = computed(() =>
    filter.value === 'finished'
      ? tasks.value.filter(t => t.finishedAt)
      : tasks.value.filter(t => !t.finishedAt)
  );
  // sorted: deadline ascending (nulls last), then created_at descending

  async function fetchTasks() { /* GET /api/tasks?show=... */ }
  async function createTask(data) { /* optimistic add, POST /api/tasks */ }
  async function updateTask(id, data) { /* optimistic update, PATCH /api/tasks/[id] */ }
  async function toggleComplete(id) { /* optimistic toggle finished_at */ }

  return { tasks, filter, isLoading, filteredTasks, fetchTasks, createTask, updateTask, toggleComplete };
});
```

**`useSettingsStore`:**
```typescript
// stores/useSettingsStore.ts
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null);
  const isLoading = ref(false);

  async function fetchSettings() { /* GET /api/settings */ }
  async function updateSettings(data) { /* PATCH /api/settings, invalidates scheduler cache */ }
  async function sendTestNotification() { /* POST /api/telegram-test */ }

  return { settings, isLoading, fetchSettings, updateSettings, sendTestNotification };
});
```

Settings fetched once on app init (after login), cached for the session.

---

## 10. Pages & Layout

- **`layouts/default.vue`** — minimal top bar: "ADHDone" title, settings gear icon (links to `/settings`), `<slot />`
- **`pages/login.vue`** — `layout: false`, full-page minimal: PIN input + button
- **`pages/index.vue`** — dashboard, uses default layout
- **`pages/settings.vue`** — settings page, uses default layout

---

## 11. Nuxt Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,                                  // SPA mode
  modules: ['nuxt-cron', '@nuxt/ui'],
  cron: {
    runOnInit: false,
    timeZone: 'UTC',
    jobsDir: 'server/cron',
  },
  devtools: { enabled: true },
});
```

---

## 12. Environment Variables

Three secrets only — everything else is in the DB `settings` row:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234gh...
OPENROUTER_API_KEY=sk-or-v1-...
DASHBOARD_PIN=1234
```

DB path is hardcoded: `./data/tasks.db`

---

## 13. Docker / Deployment

```dockerfile
# Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY .output .output
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - DASHBOARD_PIN=${DASHBOARD_PIN}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

SQLite file survives redeploys via the `./data` bind mount. Single container, no Postgres dependency.

---

## 14. Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/tasks.db',
  },
} satisfies Config;
```

---

## 15. Auto-Migration Plugin

```typescript
// server/plugins/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../db';

export default defineNitroPlugin(() => {
  migrate(db, { migrationsFolder: 'drizzle' });
});
```

Also seeds the default `settings` row if none exists:
```typescript
db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing().run();
```

---

## 16. Key Design Decisions (from grilling)

| Decision | Rationale |
|----------|-----------|
| SQLite over PostgreSQL | Personal app, zero maintenance, single file, bind mount survives redeploys |
| SPA mode over SSR | No SEO, no public users, simpler mental model, eliminates hydration issues |
| Telegram send-only | Dashboard is the management surface; Telegram is a notification channel only |
| No `task_type` column | A task can have deadline, recurring, both, or neither. Presence of fields IS the type |
| `finished_at` over `status` | Softer, audit-friendly completion; enables "future research" on completed tasks |
| No delete, ever | All tasks persist; `finished_at` is the only completion mechanism |
| AI two-step (ask→enhance) | One back-and-forth for deeper task understanding; editable preview before applying |
| nuxt-cron `everyHour` | Round reminders to nearest hour, save processing, precise enough for personal use |
| PIN gate with SHA-256 cookie | Thin protection for a personal app; no JWT library needed; 30-day sliding session |
| Settings in DB, secrets in `.env` | Configurable from UI without restart; secrets stay in env |
| Raw fetch over Telegraf | Single `sendMessage` call; Telegraf's 200kb for a one-call use case is dead weight |
| Pinia (one store per entity) | Keeps page components thin, stores are testable, matches Nuxt ecosystem |
| Auto-migrate on startup | One less command to remember; idempotent for SQLite |
| Reminder presets in settings | UI convenience layer; tasks store raw minute values; preset changes don't affect existing tasks |
| Recurring tasks auto-reset | `finished_at = NULL` before each nudge; recurring = always pending |
| Log only errors | `notification_logs` only gets rows on failure; no audit-trail bloat |

---

## 17. Build Order

1. **Scaffold + DB** — Nuxt init, install deps, Drizzle schema, auto-migrate plugin, verify SQLite
2. **API routes** — Tasks CRUD + settings + auth, test via REST client
3. **Auth middleware** — PIN gate working on all protected routes
4. **AI service** — OpenRouter ask + enhance, test independently
5. **Frontend stores** — Pinia stores for tasks and settings
6. **Dashboard page** — Task cards, filter tabs, empty states, create/edit modals
7. **AI modal** — Nested modal with ask → answer → preview → apply flow
8. **Settings page** — All sections, reminder presets CRUD, test notification, log panel
9. **Login page** — Full-page minimal PIN gate
10. **Telegram** — Send utility, scheduler cron job, notification error logging
11. **Deploy** — Docker + Dokploy with bind mount
