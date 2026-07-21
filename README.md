# eTax

Full Supabase-backed MVP for a Filipino taxpayer guidance workspace.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment variables:

```bash
cp .env.example .env.local
```

Fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Apply Supabase schema and seed data.

For local Supabase:

```bash
supabase db reset
```

For hosted Supabase, run the SQL in:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/seed.sql`

If the schema is already applied but the Supabase CLI is unavailable, seed
through the HTTP APIs:

```bash
python3 scripts/seed_supabase.py
```

4. Start the app:

```bash
npm run dev
```

## Demo Account

The seed creates:

```text
Email: demo@etax.local
Password: DemoPass123!
```

The demo account is an already-registered taxpayer with seeded profile, checklist, deadlines, and filing obligations.

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

## Product Boundary

eTax is a guidance, readiness, and filing tracker workspace. It can generate profile-populated PDF previews for review, but it does not submit real tax filings, process real payments, compute tax obligations for all taxpayer categories, or provide legal/tax advisory services.
