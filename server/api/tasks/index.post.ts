import { db, schema } from '../../db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.title || !body.title.trim()) {
    throw createError({ statusCode: 400, message: 'Title is required' });
  }

  const result = db.insert(schema.tasks).values({
    title: body.title.trim(),
    description: body.description || '',
    deadline: body.deadline || null,
    reminderOffsets: JSON.stringify(body.reminderOffsets || []),
    recurringCron: body.recurringCron || null,
  }).returning().get();

  return result;
});
