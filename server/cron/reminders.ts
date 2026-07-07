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
  cachedSettings = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get() ?? null;
}

export default defineCronHandler('everyHour', async () => {
  if (!cachedSettings) await refreshSettings();
  if (!cachedSettings?.chatId) {
    if (!settingsWarned) {
      console.warn('Scheduler skipped: chat_id not configured');
      db.insert(schema.notificationLogs).values({
        eventType: 'daily_digest',
        errorMessage: 'chat_id not configured in settings',
      }).run();
      settingsWarned = true;
    }
    return;
  }
  settingsWarned = false;

  const now = moment().tz(cachedSettings.timezone || 'UTC');
  const currentHour = now.hour();
  const currentDate = now.format('YYYY-MM-DD');

  // 1. Daily Digest
  if (currentHour === (cachedSettings.dailyDigestHour || 9)) {
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
            cachedSettings!.chatId!,
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
          await sendTelegramMessage(cachedSettings!.chatId!, `🔄 Did you "${task.title}"?`);
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
      else if (dl.isBefore(now.clone().endOf('day'))) dueToday.push(t);
      else if (dl.isBefore(now.clone().add(7, 'days'))) dueThisWeek.push(t);
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
