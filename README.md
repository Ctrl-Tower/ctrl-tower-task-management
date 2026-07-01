# Ctrl Tower — Task Board

A self-contained team task-management board styled after the Silicon Valley
scrum board: **status columns** across the top (Ice Box, Emergency, In Progress,
Testing, Complete) × **category swimlanes** down the left. Tasks are draggable
between cells; each task opens to a detail view with assignees, a timeline,
progress notes, and GitHub / URL links.

No public sign-up — an admin creates user accounts; team members sign in with
those credentials.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS** (slate theme)
- **PostgreSQL** + **Prisma**
- Cookie/JWT auth (`jose` + `bcryptjs`), gated by Next middleware
- Drag & drop via `@dnd-kit`

## Local development

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env        # then edit JWT_SECRET / seed admin password

# 3. Start Postgres (Docker) — exposed on host port 5433
docker compose up -d

# 4. Apply schema + seed the admin, columns, categories, demo tasks
npm run db:migrate          # creates tables
npm run db:seed             # admin + board

# 5. Run
npm run dev                 # http://localhost:3000
```

Sign in with the seeded admin (defaults: `admin@ctrltower.local` / `changeme123`
— override via `SEED_ADMIN_*` in `.env`). **Change this password.**

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (prod/CI) |
| `npm run db:seed` | Seed admin + board |
| `npm run db:studio` | Prisma Studio (inspect data) |

## Usage

- **Board** — drag cards across columns; click a card to open it; **+ Add task**
  at the bottom of a column to create one.
- **Import from Granola** — button on the board. Paste a Granola share link (or the
  note text) and Claude extracts the clear action items; review, then create. Assigns
  a person only when the note names a known teammate. Needs `ANTHROPIC_API_KEY`.
- **Team** — create team members; everyone manages only their own name/password
  (from the account menu, top-right).
- **Settings** — categories, the priority legend, and the auto-archive threshold.

## Deployment

Keep this off the SOC 2 production AWS account to avoid expanding audit scope.
Recommended host: **Vercel + Neon Postgres** (both have free tiers).

### Vercel + Neon (recommended)

1. Push this repo to GitHub.
2. In **Vercel**, "Add New → Project" and import the repo.
3. In the project's **Storage** tab, "Create Database → Neon". Vercel auto-adds
   `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) — the exact names
   the Prisma schema reads. No extra DB variables needed.
4. Add `JWT_SECRET` = output of `openssl rand -base64 32` (Settings →
   Environment Variables). Optionally `SEED_USER_NAME` / `SEED_USER_PASSWORD`.
5. **Deploy.** Vercel runs `vercel-build`, which applies migrations
   (`prisma migrate deploy`) and builds the app.
6. Seed the first user once against the prod DB. Locally, with the prod
   `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in your shell: `npm run db:seed`.

The app is serverless on Vercel; Prisma uses the pooled `DATABASE_URL` at
runtime and the direct `DATABASE_URL_UNPOOLED` for migrations.

### Docker (Railway, Fly, a VM, etc.)

Portable image — runs `prisma migrate deploy` on start, serves on port 3000:

```bash
docker build -t ctrl-tower-task-board .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/db" \
  -e DATABASE_URL_UNPOOLED="postgresql://USER:PASS@HOST:5432/db" \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  ctrl-tower-task-board
```

On Railway: add a Postgres service, set `JWT_SECRET`, and point `DATABASE_URL`
/ `DATABASE_URL_UNPOOLED` at it (Railway provides the connection string).

## Environment variables

| Var | Description |
|-----|-------------|
| `DATABASE_URL` | Postgres connection (pooled on Neon) — used by the app |
| `DATABASE_URL_UNPOOLED` | Direct/unpooled Postgres connection — used for migrations |
| `JWT_SECRET` | Secret for signing session cookies (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | Anthropic key for the Granola importer (server-side only). Optional — importer is disabled if unset. |
| `SEED_USER_NAME` / `SEED_USER_PASSWORD` | First user, used by the seed script |
