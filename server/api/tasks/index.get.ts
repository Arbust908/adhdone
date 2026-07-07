import { db, schema } from '../../db';
import { eq, isNull, isNotNull, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const show = query.show as string | undefined;

  let tasks;
  if (show === 'finished') {
    tasks = db.select()
      .from(schema.tasks)
      .where(isNotNull(schema.tasks.finishedAt))
      .orderBy(desc(schema.tasks.finishedAt))
      .all();
  } else {
    tasks = db.select()
      .from(schema.tasks)
      .where(isNull(schema.tasks.finishedAt))
      .all();
  }

  // Sort: deadline ascending (nulls last), then created_at descending
  tasks.sort((a, b) => {
    if (!a.deadline && !b.deadline) return b.createdAt!.localeCompare(a.createdAt!);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  return tasks;
});
