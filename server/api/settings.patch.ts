import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { refreshSettings } from '../cron/reminders';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const updates: Record<string, any> = {};

  if (body.chatId !== undefined) updates.chatId = body.chatId;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.dailyDigestHour !== undefined) updates.dailyDigestHour = body.dailyDigestHour;
  if (body.aiModel !== undefined) updates.aiModel = body.aiModel;
  if (body.reminderPresets !== undefined) {
    updates.reminderPresets = JSON.stringify(body.reminderPresets);
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' });
  }

  const result = db.update(schema.settings)
    .set(updates)
    .where(eq(schema.settings.id, 1))
    .returning()
    .get();

  // Refresh scheduler's cached settings
  refreshSettings();

  return {
    ...result,
    reminderPresets: JSON.parse(result.reminderPresets || '[]'),
  };
});
