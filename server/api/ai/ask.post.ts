import { getClarifyingQuestions } from '../../services/ai';

export default defineEventHandler(async (event) => {
  const { title, description } = await readBody(event);

  if (!title || !title.trim()) {
    throw createError({ statusCode: 400, message: 'Title is required' });
  }

  const questions = await getClarifyingQuestions(title, description || undefined);
  return { questions };
});
