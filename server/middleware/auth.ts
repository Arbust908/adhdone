import { createHash } from 'crypto';

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (path === '/login' || path === '/api/auth' || path === '/api/health') return;

  const cookie = getCookie(event, 'adhdone_auth');
  const pinHash = createHash('sha256').update(process.env.DASHBOARD_PIN || '').digest('hex');

  if (cookie !== pinHash) {
    if (path.startsWith('/api/')) {
      throw createError({ statusCode: 401, message: 'Unauthorized' });
    }
    return sendRedirect(event, '/login');
  }

  // Sliding expiration: re-issue cookie
  setCookie(event, 'adhdone_auth', pinHash, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60,
  });
});
