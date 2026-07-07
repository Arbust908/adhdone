# PIN gate with SHA-256 hashed cookie, not JWT

Dashboard access is protected by a single PIN (stored in `.env` as `DASHBOARD_PIN`). On successful login, the server sets an httpOnly cookie containing the SHA-256 hash of the PIN. The auth middleware compares the cookie value to `hash(env.PIN)` on every request. No JWT, no session store, no user table.

**Considered Options:**
- No auth — bind to localhost, access via SSH tunnel. Secure but inconvenient (can't open on phone)
- JWT — sign a token with a secret, verify on each request. Standard but overengineered for a single-user app with one secret
- SHA-256 cookie — the PIN IS the secret, hashed before storage, compared on every request. Stateless, no extra dependencies

**Consequences:**
- No logout button needed — close the browser tab
- Changing the PIN in `.env` invalidates all existing cookies (the hashes won't match)
- The `secure` flag is off (assumes HTTP on local/VPS). If deployed with HTTPS, set to true
- 30-day sliding expiration via maxAge — convenient for daily use, refreshes on each request
- The `/login` page, `/api/auth`, and `/api/health` are the only unprotected routes
