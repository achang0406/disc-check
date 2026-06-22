# PickupFrisbee

PickupFrisbee is a lightweight web app for tracking ultimate frisbee pickup games. Browse **groups**, RSVP to weekly games with plus-ones, and chat with your pickup community in one thread per group.

Game and RSVP data live in **Supabase Postgres** (`pickup_frisbee` schema). Live cursors, chat, and RSVP updates use **Supabase Realtime**. Player profiles stay in the browser.

## Tech stack

- [React 19](https://react.dev/) + [Vite 6](https://vite.dev/)
- [Supabase](https://supabase.com/) — Postgres + Realtime + Edge Functions
- [Vercel](https://vercel.com/) — static frontend hosting

## Supabase projects

| Environment | Project | Schema |
|-------------|---------|--------|
| **Production** | DiscCheck hub (`mczxxonwvsztbrqmjzlu`) | `pickup_frisbee` |
| **Preview / local dev** | Staging (`iunqmpxpwhybqyfxcsdt`) | `pickup_frisbee` |

Both apps share the prod hub (one schema per app). See [`docs/two-project-supabase-migration-plan.md`](docs/two-project-supabase-migration-plan.md) for architecture details.

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

Point `.env.local` at **staging** for local development:

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Staging project URL (`iunqmpxp…`) |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key |
| `VITE_SUPABASE_DB_SCHEMA` | `pickup_frisbee` |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role (seed only) |

Production uses the prod hub URL and anon key with the same schema name.

### 2. Seed groups and games

```bash
npm install
npm run db:seed
```

Seeding requires `VITE_SUPABASE_DB_SCHEMA=pickup_frisbee` (set in `.env.local` or on the command line).

Fresh schema DDL: [`supabase/schema.sql`](supabase/schema.sql) (creates `pickup_frisbee` on a new or shared hub project).

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:5173`.

## Admin

Each group has its own admin passcode (seeded via `scripts/seed-data.mjs` or `GROUP_ADMIN_PASSCODE`). On a **group page**, tap the PickupFrisbee title five times and enter that group's 4-digit passcode. Admins can **Edit group**, **+ Add game**, and edit/delete games in that group only.

Passcodes are verified server-side via Supabase RPCs — suitable for a trusted pickup community, not multi-tenant security.

## Deploy to Vercel

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_SUPABASE_URL` | Prod hub URL | Staging URL |
| `VITE_SUPABASE_ANON_KEY` | Prod hub anon | Staging anon |
| `VITE_SUPABASE_DB_SCHEMA` | `pickup_frisbee` | `pickup_frisbee` |

Build: `npm run build` → output `dist`.

Run `npm run db:seed` once against prod `pickup_frisbee` after applying schema SQL.

## Realtime features

| Feature | Supabase mechanism |
|---------|-------------------|
| Live RSVPs (counts, names) | Postgres changes on `rsvps` |
| Live game updates | Postgres changes on `games` |
| Live cursors | Realtime broadcast |
| Chat bubbles & typing | Realtime broadcast |

## Security note

RSVPs use open RLS policies (no login). Anyone with the anon key can read/write RSVPs, matching the app's original local-only trust model.

## Project structure

```
supabase/schema.sql              pickup_frisbee DDL
supabase/functions/              Edge functions (push)
src/lib/                         Supabase client and data access
scripts/seed.mjs                 Seed default groups/games
docs/two-project-supabase-migration-plan.md
```

## License

Private project — no license specified.
