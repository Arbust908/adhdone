import { db, schema } from '../db';
import { sql } from 'drizzle-orm';

export default defineNitroPlugin(() => {
  // Create tables if they don't exist
  db.run(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      chat_id INTEGER,
      timezone TEXT DEFAULT 'UTC',
      daily_digest_hour INTEGER DEFAULT 9,
      ai_model TEXT DEFAULT 'deepseek/deepseek-chat',
      reminder_presets TEXT DEFAULT '[{"label":"15 minutes before","minutes":15},{"label":"30 minutes before","minutes":30},{"label":"1 hour before","minutes":60},{"label":"2 hours before","minutes":120},{"label":"1 day before","minutes":1440},{"label":"2 days before","minutes":2880},{"label":"1 week before","minutes":10080}]'
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      deadline TEXT,
      reminder_offsets TEXT DEFAULT '[]',
      recurring_cron TEXT,
      last_notified TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      event_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed default settings row if none exists
  db.insert(schema.settings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .run();

  console.log('Database migrated successfully');
});
