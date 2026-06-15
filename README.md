# PickupFrisbee

PickupFrisbee is a lightweight web app for tracking ultimate frisbee pickup games. Browse **groups**, RSVP to weekly games with plus-ones, and chat with your pickup community in one thread per group.

Game and RSVP data live in **Supabase Postgres**. Live cursors, chat, and RSVP updates use **Supabase Realtime** (free tier). Player profiles stay in the browser.

## Tech stack

- [React 19](https://react.dev/) + [Vite 6](https://vite.dev/)
- [Supabase](https://supabase.com/) — Postgres + Realtime
- [Vercel](https://vercel.com/) — static frontend hosting

## Setup

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free tier)
2. Create a new project
3. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql)

### 2. Configure environment

```bash
cp .env.example .env.local
```

From Supabase **Settings → API**, copy into `.env.local`:

| Variable | Where |
|----------|--------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `GROUP_ADMIN_PASSCODE` | override default group passcode when seeding (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (seed only) |

### 3. Seed groups and games

```bash
npm install
npm run db:seed
```

### 4. Run locally

```bash
npm run dev
```

Open `http://localhost:5173`. Supabase env vars are required for game and RSVP data.

## Admin

Each group has its own admin passcode (seeded via `scripts/seed-data.mjs` or `GROUP_ADMIN_PASSCODE`). After applying migrations, run `npm run db:seed`.

On a **group page**, tap the PickupFrisbee title five times and enter that group's 4-digit passcode. Admins can **Edit group**, **+ Add game**, and edit/delete games in that group only.

Passcodes are verified server-side via Supabase RPCs — suitable for a trusted pickup community, not multi-tenant security.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSCODE` (if using admin)
5. Deploy — no separate WebSocket or API server needed

Run `npm run db:seed` once against your production Supabase project to insert default games and the admin passcode.

## Realtime features

| Feature | Supabase mechanism |
|---------|-------------------|
| Live RSVPs (counts, names) | Postgres changes on `rsvps` table |
| Live game updates | Postgres changes on `games` table |
| Live cursors | Realtime broadcast |
| Chat bubbles & typing | Realtime broadcast |

Free tier includes ~200 concurrent Realtime connections and 2M messages/month — plenty for a pickup group.

## Security note

RSVPs use open RLS policies (no login). Anyone with the anon key can read/write RSVPs, matching the app's original local-only trust model. Add Supabase Auth later if you need stricter access control.

## Project structure

```
supabase/schema.sql   Database schema + RLS + Realtime
src/lib/              Supabase client and data access
src/hooks/            App state and Realtime presence
scripts/seed.mjs      Seed default games
```

## License

Private project — no license specified.
# disc-check
