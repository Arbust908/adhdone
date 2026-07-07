import { createHash } from 'crypto';

export default defineEventHandler(async (event) => {
  const { pin } = await readBody(event);
  const expectedHash = createHash('sha256').update(process.env.DASHBOARD_PIN || '').digest('hex');
  const providedHash = createHash('sha256').update(pin || '').digest('hex');

  if (providedHash !== expectedHash) {
    throw createError({ statusCode: 401, message: 'Invalid PIN' });
  }

  setCookie(event, 'adhdone_auth', expectedHash, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60,
  });

  return { success: true };
});
