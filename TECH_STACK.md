# eTax Technical Stack

## Overview

eTax will be built with a modern web application stack focused on speed, type safety, responsive UI, and a lightweight backend foundation.

Core stack:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase

## Frontend

### Next.js

Next.js is the primary application framework.

Use Next.js for:

- App routing.
- Page layouts.
- Server-rendered and client-rendered views.
- API route handlers when lightweight server logic is needed.
- Production deployment readiness.

Recommended structure:

- `app/` for routes, layouts, and page-level composition.
- `components/` for reusable UI components.
- `features/` for domain-specific product areas.
- `lib/` for shared utilities, clients, and configuration.
- `types/` for shared TypeScript types.

## Language

### TypeScript

TypeScript is required across the codebase.

Use TypeScript for:

- Strongly typed user profiles.
- Tax roadmap and checklist models.
- Filing status and deadline entities.
- Supabase query responses.
- Component props and shared UI contracts.

Avoid `any` unless there is a clear boundary with an external library and the type is immediately narrowed.

## Styling

### Tailwind CSS

Tailwind CSS is the styling layer.

Use Tailwind for:

- Responsive layouts.
- Spacing and sizing.
- Color tokens.
- Typography utilities.
- Component states.
- Dark mode support.

Tailwind should follow the design direction in `DESIGN.md`. Theme values should map to the Minimals-inspired color, radius, shadow, and spacing tokens defined there.

Recommended approach:

- Keep global styles minimal.
- Use utility classes for layout and component styling.
- Extract repeated UI into components instead of repeating long class strings.
- Configure brand colors, semantic colors, radius, and shadows in `tailwind.config`.

## Backend and Data

### Supabase

Supabase is the backend platform for authentication, database, storage, and server-side data access.

Use Supabase for:

- User authentication.
- Taxpayer profile storage.
- Roadmap and checklist persistence.
- Deadline and reminder data.
- Filing and payment status tracking.
- Optional document metadata storage.

Recommended core tables:

- `profiles`
- `taxpayer_profiles`
- `roadmap_steps`
- `document_checklist_items`
- `deadlines`
- `filing_obligations`
- `mock_filing_modules`

Use Row Level Security for all user-owned data.

## Suggested Architecture

```text
Next.js app
  |
  +-- UI components
  +-- Feature modules
  +-- Server actions / route handlers
  |
Supabase
  |
  +-- Auth
  +-- Postgres
  +-- Row Level Security
  +-- Storage, if document metadata or uploads are needed
```

## Feature Ownership

| Feature | Primary Stack |
| --- | --- |
| Onboarding | Next.js, TypeScript, Tailwind |
| Taxpayer profile | Next.js, Supabase, TypeScript |
| Compliance roadmap | Next.js, Supabase, Tailwind |
| Document checklist | Next.js, Supabase, TypeScript |
| Deadline calendar | Next.js, Supabase |
| Filing tracker | Next.js, Supabase |
| Mock filing flow | Next.js, Supabase |
| Authentication | Supabase Auth |

## Development Standards

- Use TypeScript strict mode.
- Prefer server components by default, then client components when interactivity is required.
- Keep Supabase access centralized in shared client/server helpers.
- Validate user input before writing to Supabase.
- Keep UI components accessible and responsive.
- Store secrets in environment variables.
- Do not expose service-role Supabase keys to the browser.

## Environment Variables

Expected variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only use `SUPABASE_SERVICE_ROLE_KEY` in trusted server-side code.

## Deployment Notes

The stack is suitable for deployment on Vercel with Supabase as the hosted backend.

Before production:

- Enable Supabase Row Level Security.
- Define database migrations.
- Configure authentication redirect URLs.
- Add environment variables to the deployment platform.
- Test protected routes and user-owned data access.
