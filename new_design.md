# YourFavMatch — Backend Design (v2)

## 1. Overview

**Product:** YourFavMatch — a website where logged-in users rank their favorite tennis matches and players, and discuss in forums.

**Scope (this doc):** Backend API only: auth, catalog (matches/players/tournaments), user rankings & picks, and forum (create forums, threads, replies). Data is seeded by you initially; external API can be added later.

**Principles:** Auth-first for all ranking/pick actions. Clear domain model. Normalized DB. RESTful, versioned API. Built to scale (stateless API, DB as source of truth, room for caching/read replicas later).

---

## 2. Feature Summary

| Feature | Description | Auth required |
|--------|--------------|---------------|
| **Auth** | Register, login, refresh token, logout | — |
| **Catalog** | List/filter matches, players, tournaments (read-only for users) | No (read) |
| **Rankings** | User submits ordered lists: top 10 best-of-5 matches, top 10 best-of-3 (men’s singles), top 10 players, top 5 Grand Slam finals | Yes |
| **Picks** | User picks one: favorite player, favorite best-of-5 match, favorite best-of-3 match, best Grand Slam final | Yes |
| **Forum** | User creates a forum; users create threads and reply (converse) | Create forum / post / reply: Yes |

---

## 3. Domain Model & Tables

### 3.1 Core catalog (you seed these)

**User** — registered account, can rank and use forums.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| email | string unique | |
| passwordHash | string | argon2 |
| displayName | string nullable | |
| createdAt, updatedAt | timestamptz | |

**Tournament** — event (e.g. Wimbledon, US Open). Used to flag Grand Slams and attach matches.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| name | string | e.g. "Wimbledon" |
| slug | string unique | e.g. "wimbledon" |
| isGrandSlam | boolean | true for AO, FO, Wimbledon, US Open |
| createdAt, updatedAt | timestamptz | |

**Player** — tennis player (for “top 10 players” and “favorite player” pick).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| name | string | |
| countryCode | string nullable | e.g. "SUI" |
| slug | string unique | |
| createdAt, updatedAt | timestamptz | |

**Match** — a tennis match. Supports best-of-3 vs best-of-5, final vs non-final, and category (e.g. men’s singles).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| tournamentId | UUID FK → Tournament | |
| year | int | |
| round | string | "Final", "Semifinal", "Quarterfinal", ... |
| isFinal | boolean | derived or stored (round = 'Final') |
| bestOf | int | 3 or 5 |
| category | string | e.g. "men_singles", "women_singles" (for filtering men’s singles) |
| player1Id | UUID FK → Player nullable | optional for seed simplicity |
| player2Id | UUID FK → Player nullable | |
| score | string nullable | e.g. "6-4, 6-3, 7-6(4)" |
| title | string nullable | e.g. "Federer vs Nadal" (can be computed from players) |
| createdAt, updatedAt | timestamptz | |

- **Best-of-5:** `match.bestOf = 5`.
- **Best-of-3 men’s singles:** `match.bestOf = 3` and `match.category = 'men_singles'`.
- **Grand Slam final:** match where `tournament.isGrandSlam = true` and `match.isFinal = true` (or `round = 'Final'`).

### 3.2 User rankings (ordered lists)

Each table stores one ordered list per user. Position is 1–10 or 1–5.

**UserTop10BestOf5Matches**

| Column | Type | Notes |
|--------|------|--------|
| userId | UUID FK → User | |
| matchId | UUID FK → Match | |
| position | int | 1..10 |
| createdAt, updatedAt | timestamptz | |
| PK (userId, position) | | one match per position per user |

Constraint: `match.bestOf = 5` (enforced in app or CHECK if you add matchId logic in DB).

**UserTop10BestOf3Matches**

| Column | Type | Notes |
|--------|------|--------|
| userId | UUID FK → User | |
| matchId | UUID FK → Match | |
| position | int | 1..10 |
| createdAt, updatedAt | timestamptz | |
| PK (userId, position) | | |

Constraint: match must be best-of-3 men’s singles (bestOf=3, category=men_singles).

**UserTop10Players**

| Column | Type | Notes |
|--------|------|--------|
| userId | UUID FK → User | |
| playerId | UUID FK → Player | |
| position | int | 1..10 |
| createdAt, updatedAt | timestamptz | |
| PK (userId, position) | | |

**UserTop5GrandSlamFinals**

| Column | Type | Notes |
|--------|------|--------|
| userId | UUID FK → User | |
| matchId | UUID FK → Match | |
| position | int | 1..5 |
| createdAt, updatedAt | timestamptz | |
| PK (userId, position) | | |

Constraint: match must be a Grand Slam final (tournament.isGrandSlam and match.isFinal).

### 3.3 User picks (single choice each)

One row per user; each column is one “favorite” pick.

**UserPicks**

| Column | Type | Notes |
|--------|------|--------|
| userId | UUID PK, FK → User | one row per user |
| favoritePlayerId | UUID FK → Player nullable | |
| favoriteBestOf5MatchId | UUID FK → Match nullable | |
| favoriteBestOf3MatchId | UUID FK → Match nullable | |
| bestGrandSlamFinalMatchId | UUID FK → Match nullable | |
| createdAt, updatedAt | timestamptz | |

Validate in API: favoriteBestOf5MatchId must be bestOf=5; favoriteBestOf3MatchId bestOf=3 and men’s singles; bestGrandSlamFinalMatchId must be a GS final.

### 3.4 Forum (for “converse with other users”)

**Forum** — a board created by a user.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| createdById | UUID FK → User | |
| title | string | |
| slug | string unique | |
| description | text nullable | |
| createdAt, updatedAt | timestamptz | |

**Thread** — a conversation/topic inside a forum.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| forumId | UUID FK → Forum | |
| authorId | UUID FK → User | |
| title | string | |
| body | text nullable | optional first post body |
| createdAt, updatedAt | timestamptz | |

**Post** — a message in a thread (first post can be thread.body or a separate Post; here we treat first message as a Post for uniformity).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| threadId | UUID FK → Thread | |
| authorId | UUID FK → User | |
| body | text | |
| createdAt, updatedAt | timestamptz | |

Optional: **soft delete** (deletedAt) or **edit history** later; not required for v1.

---

## 4. API Design

Base path: **`/api/v1`**. All endpoints return JSON. Auth via **Bearer &lt;accessToken&gt;** unless stated otherwise.

### 4.1 Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /auth/register | Register (email, password, displayName?) | No |
| POST | /auth/login | Login → accessToken + refreshToken | No |
| POST | /auth/refresh | Body: { refreshToken } → new accessToken (and optionally refreshToken) | No (use refresh token) |
| POST | /auth/logout | Invalidate refresh token (if stored) | Optional |

Request/response examples (conceptual):

- **Register:** `POST /api/v1/auth/register`  
  Body: `{ "email", "password", "displayName?" }`  
  Response: `201` + user (id, email, displayName) + tokens or `201` + “please login”.

- **Login:** `POST /api/v1/auth/login`  
  Body: `{ "email", "password" }`  
  Response: `200` + `{ accessToken, refreshToken, expiresIn, user: { id, email, displayName } }`.

### 4.2 Catalog (read-only for clients)

| Method | Path | Description |
|--------|------|-------------|
| GET | /tournaments | List tournaments (query: isGrandSlam?) |
| GET | /tournaments/:id | One tournament |
| GET | /players | List players (query: limit, offset, search?) |
| GET | /players/:id | One player |
| GET | /matches | List matches (query: tournamentId, year, bestOf, isFinal, category, limit, offset) |
| GET | /matches/:id | One match (with tournament, players if present) |

All catalog GETs are public (no auth required). Filtering by bestOf (3 or 5), isFinal, category supports your ranking/pick rules.

### 4.3 Rankings (authenticated)

Replace full list each time (PUT) or support PATCH; PUT is simpler and matches “submit my top 10”.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | /me/rankings/best-of-5 | — | Current user’s top 10 best-of-5 matches (ordered) |
| PUT | /me/rankings/best-of-5 | { matchIds: [uuid, ...] } | Set list (length 1–10; matchIds must be bestOf=5) |
| GET | /me/rankings/best-of-3 | — | Current user’s top 10 best-of-3 men’s singles |
| PUT | /me/rankings/best-of-3 | { matchIds: [uuid, ...] } | Set list (validated) |
| GET | /me/rankings/players | — | Current user’s top 10 players |
| PUT | /me/rankings/players | { playerIds: [uuid, ...] } | Set list |
| GET | /me/rankings/grand-slam-finals | — | Current user’s top 5 GS finals |
| PUT | /me/rankings/grand-slam-finals | { matchIds: [uuid, ...] } | Set list (1–5; must be GS finals) |

Validation: matchIds/playerIds must exist and satisfy format (bestOf, category, isGrandSlam). Return 400 with clear errors if not.

### 4.4 Picks (authenticated)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | /me/picks | — | Current user’s picks (favorite player, fav BO5, fav BO3, best GS final) |
| PUT | /me/picks | { favoritePlayerId?, favoriteBestOf5MatchId?, favoriteBestOf3MatchId?, bestGrandSlamFinalMatchId? } | Set one or more; null to clear |

Partial update: send only fields to change. Validate type (player vs match, and match format) per field.

### 4.5 Forum (authenticated for write)

| Method | Path | Description |
|--------|------|-------------|
| GET | /forums | List forums (query: limit, offset) |
| GET | /forums/:id | One forum (with thread count or recent threads) |
| POST | /forums | Create forum (title, slug?, description?) — auth required |
| PATCH | /forums/:id | Update own forum (title, description) |
| GET | /forums/:id/threads | List threads (limit, offset, sort) |
| POST | /forums/:id/threads | Create thread (title, body?) — auth required |
| GET | /threads/:id | One thread with posts (paginated) |
| POST | /threads/:id/posts | Add reply (body) — auth required |
| PATCH | /posts/:id | Edit own post (body) — optional for v1 |

---

## 5. Tech Stack (recommended)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | **Node.js** (LTS) | Your requirement; large ecosystem. |
| Language | **TypeScript** | Types, refactor safety, better DX at scale. |
| Framework | **Fastify** | High throughput, low overhead, built-in schema validation, async. Alternative: **NestJS** if you prefer dependency injection and modules. |
| ORM | **Prisma** or **Drizzle** | Prisma: great migrations, type-safe client, easy onboarding. Drizzle: lighter, SQL-like, good for devs who want more control. Both work with Postgres. |
| DB | **PostgreSQL** | Your requirement; JSON support, indexes, mature. |
| Auth | **JWT** (access + refresh) | Stateless API; store refresh tokens in DB (or in Redis) for revocation. |
| Password hashing | **argon2** (e.g. `argon2` npm) | Industry standard, resistant to GPU cracking. |
| Validation | **Zod** | Schema validation + TypeScript inference; use in routes and DTOs. |
| Config | **env + dotenv or @nestjs/config** | Twelve-factor; no secrets in code. |
| Logging | **pino** (built into Fastify) or **winston** | Structured logs for production. |
| Testing | **Vitest** + **supertest** (or **axios** for HTTP) | Fast, ESM-friendly; integration tests against real Postgres (e.g. test container or dedicated DB). |
| Migrations | **Prisma migrate** or **Drizzle Kit** | Versioned schema; same as ORM choice. |
| API versioning | **URL prefix** `/api/v1` | Simple and explicit. |

Optional later: **Redis** (sessions/refresh token store, rate limit, cache), **read replicas** for Postgres, **message queue** for heavy or async jobs.

---

## 6. Project structure (suggested)

```
src/
  app.ts                 # or main.ts — bootstrap app, attach routes
  config/
    index.ts             # load env, export config
  modules/
    auth/
      auth.controller.ts # or auth.routes.ts
      auth.service.ts
      auth.schema.ts     # Zod schemas
      (strategies, guards if NestJS)
    users/
      user.service.ts
      (user.repository if you abstract DB)
    tournaments/
    players/
    matches/
    rankings/            # all four ranking types + validation
    picks/
    forums/
      forum.routes.ts
      thread.routes.ts
      post.routes.ts
  db/
    client.ts            # Prisma client or Drizzle instance
    seed/
      index.ts           # run seed script
      data/              # JSON or TS with matches, players, tournaments
  middleware/
    auth.middleware.ts   # verify JWT, attach user
    errorHandler.ts
  lib/
    errors.ts            # AppError, 400/401/404 handlers
  types/
    express.d.ts         # or fastify types for user on request
prisma/                  # or drizzle/
  schema.prisma
  migrations/
  seed.ts
tests/
  integration/
  e2e/
```

Keep controllers thin (parse request, call service, return response). Put business rules and validation in services; use shared validation helpers for “match is best-of-5”, “match is GS final”, etc.

---

## 7. Data seeding & external API

- **Seed file:** Use Prisma’s `seed` script (or Drizzle equivalent) that:
  - Creates tournaments (mark Grand Slams).
  - Creates players.
  - Creates matches with tournamentId, year, round, bestOf, category, isFinal, player1/2, score, title.
- **Format:** JSON or TS arrays in `prisma/seed/data/` (or `db/seed/data/`) that you edit or generate. Seed script reads and inserts in order (tournaments → players → matches) to satisfy FKs.
- **External API:** Later you can add a job (cron or manual) that fetches from a tennis API (e.g. ATP/WTA or a sports data provider), normalizes to your `Match`/`Player`/`Tournament` shape, and upserts. Design the schema so external ids can be stored (e.g. `externalId` on match/player) if needed for deduplication.

---

## 8. Implementation order

1. **Project init** — Node + TypeScript, Fastify (or NestJS), Prisma or Drizzle, env, lint.
2. **DB schema** — All tables above (users, tournaments, players, matches, ranking tables, UserPicks, forums, threads, posts). Run migrations.
3. **Auth** — Register, login (argon2 + JWT), refresh, auth middleware. Protect a dummy `/me` route.
4. **Catalog API** — GET tournaments, players, matches with filters (bestOf, isFinal, category, tournamentId).
5. **Seed script** — Insert tournaments, players, matches (enough to test rankings and picks).
6. **Rankings API** — GET/PUT for each of the four ranking types with validation.
7. **Picks API** — GET/PUT with validation.
8. **Forum API** — Forums CRUD, threads list/create, posts list/create (and optional edit).
9. **Tests** — Integration tests for auth and at least one ranking + one forum flow.
10. **Polish** — Error messages, rate limiting (optional), logging, README.

---

## 9. Summary

| Area | Decision |
|------|----------|
| **Auth** | JWT (access + refresh); argon2; all ranking/pick/forum write require login. |
| **Catalog** | Tournament, Player, Match (bestOf, isFinal, category); Tournament.isGrandSlam for GS finals. |
| **Rankings** | Four ordered lists: top 10 best-of-5, top 10 best-of-3 (men’s singles), top 10 players, top 5 GS finals. |
| **Picks** | One row per user: favorite player, favorite BO5 match, favorite BO3 match, best GS final. |
| **Forum** | Forum → Thread → Post; user creates forum and converses via threads and replies. |
| **Data** | Seed file for now; schema ready for external API later. |
| **Stack** | Node, TypeScript, Fastify (or NestJS), Postgres, Prisma or Drizzle, Zod, JWT, argon2. |

This gives you a single reference (`new_design.md`) to implement the backend. Next step: create the repo structure and DB schema (Prisma or Drizzle) from this document, then implement auth and catalog, then rankings and picks, then forum.
