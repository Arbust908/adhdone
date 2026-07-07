import { enhanceTask } from '../../services/ai';

export default defineEventHandler(async (event) => {
  const { title, description, answers } = await readBody(event);

  if (!title || !title.trim()) {
    throw createError({ statusCode: 400, message: 'Title is required' });
  }
  if (!answers || !answers.trim()) {
    throw createError({ statusCode: 400, message: 'Answers are required' });
  }

  const result = await enhanceTask(title, description || undefined, answers);
  return result;
});
