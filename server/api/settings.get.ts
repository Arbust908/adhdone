import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const settings = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
  if (!settings) {
    throw createError({ statusCode: 500, message: 'Settings not initialized' });
  }

  return {
    ...settings,
    reminderPresets: JSON.parse(settings.reminderPresets || '[]'),
  };
});
