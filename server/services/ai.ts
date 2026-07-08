import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'ADHDone',
  },
});

export async function getClarifyingQuestions(title: string, description?: string) {
  const model = process.env.AI_MODEL || 'deepseek/deepseek-chat';
  const taskText = description ? `Title: ${title}\nDescription: ${description}` : title;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a task assistant. Given a task (title and optional description), ask up to 3 concise clarifying questions to turn it into a well-defined, actionable task. Focus on necessary steps, details, context, or resources — never ask about deadlines or scheduling. Reply with a JSON object containing an array field "clarifyingQuestions".`,
      },
      { role: 'user', content: taskText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = completion.choices[0]!.message.content!;
  return JSON.parse(content).clarifyingQuestions as string[];
}

export async function enhanceTask(
  title: string,
  description: string | undefined,
  userAnswers: string
): Promise<{ title: string; description: string }> {
  const model = process.env.AI_MODEL || 'deepseek/deepseek-chat';
  const taskText = description
    ? `Title: ${title}\nDescription: ${description}`
    : `Title: ${title}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a task assistant. Given an original task and the user's answers to clarifying questions, produce a final enriched version. Output a JSON object with:
- "title": a concise task title (max 10 words).
- "description": a detailed, actionable description incorporating the user's answers.
Do NOT include any deadlines, dates, or scheduling information. Only the title and description.`,
      },
      {
        role: 'user',
        content: `Original task:\n${taskText}\n\nUser's answers to clarifying questions:\n${userAnswers}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0]!.message.content!);
}
