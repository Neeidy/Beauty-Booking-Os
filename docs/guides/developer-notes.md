# Developer Notes

## Environment Setup

- Never commit `.env` — it is gitignored. Copy `.env.example` and fill in real values locally.
- `.env.example` must only contain placeholder values (e.g. `sk-ant-...`, `your-key-here`), never real credentials.
- If you accidentally commit real API keys, rotate them immediately via the respective provider dashboard (Anthropic Console, Supabase Dashboard) and scrub git history.

## Sprint Status Reference

Sprint progress and build state are tracked in `CLAUDE.md` under "Build Order (Sprint Plan)".
See the "PROJECT STATUS" section for current test counts and what's complete.

## Local Dev Caveats

- `output: "standalone"` in `next.config.ts` is commented out locally due to a Windows EPERM error when creating `.next/standalone` symlinks. Re-enable this on Vercel/Linux for production builds.
- The database requires a running Supabase instance. Set `DATABASE_URL` in `.env` before running migrations or tests that hit the DB.
- `pnpm dev` for the web app runs on port 3030 (set in package.json dev script or `.env`).
