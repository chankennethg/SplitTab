# SplitTab — Claude Code Guide

## Project Overview

SplitTab is a bill-splitting app. Groups are identified by a UUID in the URL (no auth required — anyone with the link can view and edit). Data is stored in PostgreSQL via Drizzle ORM. The API layer is Hono.js mounted as a Next.js catch-all route handler.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, App Router, TypeScript |
| API | Hono.js (`/src/app/api/[[...route]]/route.ts`) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Tests | Vitest |

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm test             # run all tests
npm run test:watch   # tests in watch mode
npm run lint         # ESLint

npm run db:push      # apply schema to DB (dev, no migration file)
npm run db:generate  # generate migration files
npm run db:migrate   # run migration files
npm run db:studio    # Drizzle Studio GUI
```

## Environment

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://user:password@localhost:5432/splittab
```

The DB connection is lazy — it only connects on the first request, so the build works without `DATABASE_URL`.

## Project Structure

```
src/
├── app/
│   ├── api/[[...route]]/route.ts   # All API endpoints (Hono.js)
│   ├── groups/[id]/page.tsx        # Group page (Members/Expenses/Settle tabs)
│   ├── page.tsx                    # Landing page (create group)
│   ├── layout.tsx
│   └── globals.css                 # All styles (CSS variables, component classes)
├── components/
│   ├── MembersTab.tsx              # Add/remove group members
│   ├── ExpensesTab.tsx             # Log expenses, equal or custom splits
│   └── SettleUpTab.tsx             # View settlements, mark payments paid
├── db/
│   ├── schema.ts                   # Drizzle table definitions
│   └── index.ts                    # Lazy DB client (Proxy pattern)
├── lib/
│   ├── settlement.ts               # Greedy settlement calculator (pure function)
│   ├── api-client.ts               # Typed fetch wrappers for all endpoints
│   ├── api-response.ts             # ok() / err() response helpers
│   └── __tests__/settlement.test.ts
└── types/index.ts                  # Shared domain + API types
```

## Database Schema

```
groups          id (PK), name, created_at
members         id (PK), group_id → groups, name, created_at
expenses        id (PK), group_id → groups, name, amount(numeric), payer_id → members, created_at
expense_splits  id (PK), expense_id → expenses, member_id → members, amount(numeric), split_type
transactions    id (PK), group_id → groups, from_member_id, to_member_id, amount, paid_at, created_at
```

- `amount` columns use `numeric(12,2)` — never floats
- All foreign key deletes cascade from `groups` downward
- `transactions` represents "paid" status; absence = unpaid, presence = paid

## API Endpoints

All routes are under `/api` and return `{ success, data, error }`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups/:id` | Get group |
| GET | `/api/groups/:id/members` | List members |
| POST | `/api/groups/:id/members` | Add member |
| DELETE | `/api/groups/:id/members/:memberId` | Remove member |
| GET | `/api/groups/:id/expenses` | List expenses (with splits) |
| POST | `/api/groups/:id/expenses` | Add expense |
| DELETE | `/api/groups/:id/expenses/:expenseId` | Delete expense |
| GET | `/api/groups/:id/settlement` | Calculate settlement |
| POST | `/api/groups/:id/transactions` | Mark payment as paid |
| DELETE | `/api/groups/:id/transactions/:txId` | Unmark payment |

Input validation uses Zod via `@hono/zod-validator`. The `splits` array in the expense body must sum to `amount` (±$0.02 tolerance for rounding).

## Settlement Algorithm

`src/lib/settlement.ts` — pure function, no side effects, fully tested.

1. For each member: `balance = totalPaid - totalOwed`
2. Positive balance → creditor (gets money back)
3. Negative balance → debtor (owes money)
4. Greedy matching: pair largest debtor with largest creditor, partial payments allowed
5. Result is the minimum number of transactions to settle all debts

The API route fetches existing `transactions` rows and attaches their `id`/`paidAt` to the settlement output so the UI can toggle paid status.

## Coding Conventions

- **Immutability**: always return new objects, never mutate in place
- **No floats for money**: use `numeric` in DB; parse with `Number()`, round with `Math.round(n * 100) / 100`
- **API responses**: always use `ok(data)` or `err(message)` from `src/lib/api-response.ts`
- **Types**: all domain types live in `src/types/index.ts`; import from `@/types`
- **File size**: keep files under 400 lines; extract if growing larger
- **Error handling**: Hono route handlers return structured errors with appropriate HTTP status codes; never throw unhandled

## Adding a New API Route

1. Add the route in `src/app/api/[[...route]]/route.ts`
2. Add a Zod schema for the request body
3. Add the typed fetch wrapper in `src/lib/api-client.ts`
4. Add/update types in `src/types/index.ts`

## Adding a New Page or Component

- Pages go in `src/app/`
- Shared UI components go in `src/components/`
- All components are `"use client"` (group page is fully client-rendered)
- Styling is via CSS classes in `globals.css` — add new utility classes there, no inline styles for repeated patterns

## Testing

Tests live in `src/lib/__tests__/`. Run with `npm test`.

- Test pure functions (settlement calculator, validators) with unit tests
- Test API routes with integration tests against a real or in-memory DB
- Minimum 80% coverage target

When adding new features to `settlement.ts`, add a corresponding test case.
