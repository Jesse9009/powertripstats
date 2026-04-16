# PowerTripStats Starter

This project is scaffolded with:

- Next.js (App Router + TypeScript)
- Tailwind CSS
- shadcn/ui
- Drizzle ORM
- libSQL database client (`@libsql/client`) for Turso

## 1) Configure Turso

Copy env vars and fill in your Turso values:

```bash
cp .env.local.example .env.local
```

Required values:

- `TURSO_DATABASE_URL` (for example `libsql://my-db-org.turso.io`)
- `TURSO_AUTH_TOKEN`

## 2) Generate and run migrations

```bash
npm run db:generate
npm run db:migrate
```

## 3) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Optional starter seed

Seed starter users:

```bash
curl -X POST http://localhost:3000/api/seed
```

Then inspect data:

- `GET /api/users`
- The home page table at `/`

## Useful scripts

- `npm run db:generate` - Generate SQL migrations from schema changes
- `npm run db:migrate` - Apply migrations to Turso
- `npm run db:studio` - Open Drizzle Studio
