import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id')!);
  const body = await readBody(event);

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid task ID' });
  }

  const existing = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Task not found' });
  }

  const updates: Record<string, any> = {};

  if (body.title !== undefined) {
    if (!body.title || !body.title.trim()) {
      throw createError({ statusCode: 400, message: 'Title cannot be empty' });
    }
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) updates.description = body.description;
  if (body.deadline !== undefined) updates.deadline = body.deadline;
  if (body.reminderOffsets !== undefined) {
    updates.reminderOffsets = JSON.stringify(body.reminderOffsets);
  }
  if (body.recurringCron !== undefined) updates.recurringCron = body.recurringCron;

  // Toggle finished_at
  if (body.finished !== undefined) {
    if (body.finished) {
      updates.finishedAt = new Date().toISOString();
    } else if (body.finished === false) {
      updates.finishedAt = null;
    }
  }

  updates.updatedAt = new Date().toISOString();

  const result = db.update(schema.tasks)
    .set(updates)
    .where(eq(schema.tasks.id, id))
    .returning()
    .get();

  return result;
});
