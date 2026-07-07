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
  deadline: text('deadline'),
  reminderOffsets: text('reminder_offsets').default('[]'),
  recurringCron: text('recurring_cron'),
  lastNotified: text('last_notified'),
  finishedAt: text('finished_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const notificationLogs = sqliteTable('notification_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id'),
  eventType: text('event_type').notNull(),
  errorMessage: text('error_message').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
