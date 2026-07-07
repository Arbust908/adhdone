import { db, schema } from '../db';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = Math.min(parseInt(query.limit as string) || 50, 200);

  const logs = db.select()
    .from(schema.notificationLogs)
    .orderBy(desc(schema.notificationLogs.createdAt))
    .limit(limit)
    .all();

  return logs;
});
