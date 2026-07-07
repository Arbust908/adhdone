# SQLite for a web app, not PostgreSQL

ADHDone is a single-user personal application. We chose SQLite over PostgreSQL despite Nuxt/Drizzle supporting both. The alternative (PostgreSQL) was the original plan with rationale: "survives container redeploys on Dokploy." SQLite achieves the same goal with a bind-mounted `./data` directory — the `.db` file persists across redeploys with zero additional infrastructure.

**Considered Options:**
- PostgreSQL with a separate `db` container in docker-compose — adds a second service, connection strings, auth, pg_dump backups
- SQLite with a bind mount — single file, zero configuration, `cp tasks.db` backups, no second container to maintain

**Consequences:**
- No concurrent writers (fine — one user)
- Synchronous `better-sqlite3` driver works in Nitro's Node.js process without issue
- Migration to PostgreSQL in the future is trivial: Drizzle abstracts the dialect, and the schema is two main tables
- The `serial` type becomes `integer primary key autoincrement` and `timestamp` becomes `text` — minor Drizzle API differences only
