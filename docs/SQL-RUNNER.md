# SQL Runner

Run SQL files locally against your database using the provided runner.

Prereqs:
- Set `DATABASE_URL` in a `.env` file (copy `.env.example`).

Quick start:
- Run RLS smoke test:
  - `pnpm sql:rls-smoke`
- Run any SQL file:
  - `pnpm sql:run path/to/your.sql`

Notes:
- `\echo` lines in SQL are printed to the console.
- The runner executes statements sequentially and prints results for `SELECT` statements.
- If your connection requires SSL (Supabase/Neon), keep `sslmode=require` in the URL.

Troubleshooting:
- If you see `Could not resolve user` in Scenario C, adjust the user lookup in `scripts/rls-smoke-test.sql` to match your auth schema.
- If connection fails due to SSL, ensure `?sslmode=require` and that your IP/network is allowed.