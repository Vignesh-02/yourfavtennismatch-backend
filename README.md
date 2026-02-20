# YourFavMatch — Backend

Backend API for **YourFavMatch**: a site where users log in to rank their favorite tennis matches and players, and discuss in forums.

**Stack:** Node.js, TypeScript, Fastify, PostgreSQL, Prisma.

---

## Project flow

### 1. User journey (high level overview)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────────────┐
│  Register   │ ──► │    Login    │ ──► │  Browse catalog (matches, players,        │
│  / Sign up  │     │  Get tokens │     │  tournaments) — no auth needed           │
└─────────────┘     └─────────────┘     └─────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Logged-in only:                                                                  │
│  • Submit rankings: top 10 best-of-5 matches, top 10 best-of-3 (men’s singles),   │
│    top 10 players, top 5 Grand Slam finals                                        │
│  • Set picks: favorite player, favorite BO5 match, favorite BO3 match,            │
│    best Grand Slam final                                                           │
│  • Create forums, start threads, reply to posts                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Catalog** (tournaments, players, matches) is **read-only** and **public** — no login required.
- **Rankings**, **picks**, and **forum writes** require **login** (JWT in `Authorization: Bearer <accessToken>`).

### 2. Request flow (technical)

1. **Client** sends HTTP request to base URL `/api/v1/...`.
2. **Fastify** receives it; global **error handler** maps thrown `AppError` (and validation errors) to JSON error responses.
3. **Auth routes** (`/auth/*`): no middleware; register/login/refresh/logout use body/DB and return tokens.
4. **Catalog routes** (`/tournaments`, `/players`, `/matches`): no auth; services read from **Prisma** (PostgreSQL).
5. **Me routes** (`/me/rankings/*`, `/me/picks`): **auth middleware** runs first, validates JWT and sets `req.user`; then **ranking/pick services** read/write DB with `userId`.
6. **Forum routes**: list/read are public; create/update use **auth middleware**, then **forum/thread/post services** use `req.user.id`.

So: **public catalog** → **auth** → **user-scoped rankings, picks, and forum actions**.

### 3. Data flow (concepts)

- **Seed data:** You (or a seed script) insert **Tournaments**, **Players**, and **Matches** (with `bestOf` 3/5, `isFinal`, `category`, etc.). This is the catalog.
- **Rankings:** User sends ordered IDs (e.g. `matchIds` for top 10 best-of-5). Backend **replaces** that user’s list for that ranking type, validating that each ID exists and matches the rule (e.g. match is best-of-5, or Grand Slam final).
- **Picks:** User sends one ID per pick type (e.g. `favoritePlayerId`). Backend **upserts** the single row per user and validates each ID.
- **Forum:** User creates a **Forum**; then **Threads** (topics) inside it; then **Posts** (replies) in a thread. All identified by `userId` from JWT.

See **`new_design.md`** for full domain model, tables, and API details.

---

## Tech stack

| Layer      | Choice        |
|-----------|----------------|
| Runtime   | Node.js (LTS)  |
| Language  | TypeScript     |
| API       | Fastify        |
| DB        | PostgreSQL     |
| ORM       | Prisma         |
| Auth      | JWT (access + refresh), argon2 for passwords |
| Validation| Zod            |
| Config    | dotenv (.env)  |
| Logging   | Pino (Fastify) |

---

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**  
   Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — e.g. `postgresql://user:password@localhost:5432/yourfavmatch`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — at least 32 characters each

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init   # or: npx prisma db push
   npx prisma db seed
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   API is at `http://localhost:3000` (or `PORT` from env). Health: `GET /health`.

---

## API overview (base: `/api/v1`)

| Area    | Endpoints | Auth |
|---------|-----------|------|
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | No (tokens in body/response) |
| **Catalog** | `GET /tournaments`, `/tournaments/:id`, `GET /players`, `/players/:id`, `GET /matches`, `/matches/:id` | No |
| **Rankings** | `GET|PUT /me/rankings/best-of-5`, `best-of-3`, `players`, `grand-slam-finals` | Yes (Bearer) |
| **Picks** | `GET|PUT /me/picks` | Yes |
| **Forums** | `GET|POST|PATCH /forums`, `GET /forums/:id/threads`, `POST /forums/:id/threads`, `GET /threads/:id`, `POST /threads/:id/posts`, `PATCH /posts/:id` | POST/PATCH require auth |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled app |
| `npm run lint` | Run ESLint on `src` |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to DB (no migration files) |
| `npm run db:seed` | Run seed script |
| `npm run test` | Run Vitest |

---

## Project structure

```
src/
  app.ts                    # Fastify app, error handler, route registration
  config/
    index.ts                # Env (port, DATABASE_URL, JWT)
  db/
    client.ts               # Prisma client singleton
  lib/
    errors.ts               # AppError, toHttpError
  middleware/
    auth.middleware.ts      # JWT verification → req.user
  types/
    fastify.d.ts            # Augment FastifyRequest with user
  modules/
    auth/                   # Register, login, refresh, logout
    tournaments/            # List, get by id
    players/                # List (search), get by id
    matches/                # List (filters), get by id
    rankings/               # GET/PUT for 4 ranking types
    picks/                  # GET/PUT user picks
    forums/                 # Forums, threads, posts (routes + service)
prisma/
  schema.prisma             # All tables (User, Match, Player, Tournament, rankings, picks, forum)
  seed.ts                   # Sample tournaments, players, matches
```

Full API and data model are documented in **`new_design.md`**.
