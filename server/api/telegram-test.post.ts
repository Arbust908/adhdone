import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage } from '../services/telegram';

export default defineEventHandler(async () => {
  const settings = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();

  if (!settings?.chatId) {
    throw createError({ statusCode: 400, message: 'Chat ID not configured in settings' });
  }

  try {
    await sendTelegramMessage(settings.chatId, '🧪 Test notification from ADHDone! If you see this, Telegram is configured correctly.');
    return { success: true };
  } catch (err: any) {
    db.insert(schema.notificationLogs).values({
      eventType: 'daily_digest',
      errorMessage: `Test notification failed: ${err.message}`,
    }).run();
    throw createError({ statusCode: 500, message: `Telegram send failed: ${err.message}` });
  }
});
