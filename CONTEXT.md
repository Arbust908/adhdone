# ADHDone

A personal to-do dashboard with AI-enhanced task descriptions and Telegram notifications. Single-user system — one human, one database, one Telegram chat.

## Language

**Task**:
A unit of work the user wants to track or be reminded about. Has a title (required), optional description, optional deadline, optional recurring schedule, and optional reminder offsets. A task is never deleted — it's either pending or finished.
_Avoid_: Todo, item, ticket, reminder

**Pending**:
A task that is still active — `finished_at` is null. Appears in the dashboard's "Pending" tab and the daily digest.
_Avoid_: Open, active, incomplete, undone

**Finished**:
A task that has been marked complete — `finished_at` is set to the completion timestamp. Hidden from the "Pending" tab but visible in the "Finished" tab. Stays in the database permanently.
_Avoid_: Done, completed, closed, resolved, archived

**Deadline**:
An optional ISO datetime on a task representing when it's due. Used by the scheduler to send pre-deadline reminder notifications. Has no effect on the daily digest (all pending tasks appear there regardless).
_Avoid_: Due date, target date, expiry

**Reminder Offsets**:
Minutes-before-deadline values that trigger Telegram notifications. Stored as a JSON array on the task (e.g., `[60, 1440]` for 1 hour and 1 day before). Configured via presets defined in settings. After the deadline passes, no further reminders are sent.
_Avoid_: Alerts, notifications, pings

**Recurring Schedule**:
An optional cron expression on a task that triggers periodic Telegram nudges (e.g., "Did you water the plants?"). The task auto-resets to pending before each nudge. A recurring task is never truly "done" — it's a habit, not a one-shot.
_Avoid_: Repeat, interval, cycle

**Daily Digest**:
A Telegram message sent once per day (default 9am) listing all pending tasks grouped by urgency: overdue, due today, due this week, recurring, and no deadline. The primary notification surface.
_Avoid_: Morning summary, daily report, status update

**Enhancement**:
The AI-powered two-step flow that enriches a task's title and description: (1) AI asks clarifying questions about the task, (2) user answers, (3) AI generates an improved title and description. Triggered by the "Enhance with AI" button. Never touches deadlines or scheduling.
_Avoid_: Enrich, improve, AI-generate, fluff out

## Concepts

**One User**:
There is exactly one person using this system. No multi-tenancy, no user accounts, no roles. The `chat_id` for Telegram and the dashboard PIN are the only identity concepts.

**Notification Log**:
An error-only log of failed notification sends. Records entries when Telegram sendMessage fails (any event type) or when AI enhancement fails. Not an audit trail — successful operations are not logged.
