# bk-gateway-api — Copilot Coding Agent Instructions

## Project Overview
Node.js/TypeScript Express API gateway. Deployed on AWS EC2 behind an ALB. Acts as a reverse proxy to all other microservices running on the same EC2 instance. Manages leader election across ASG instances, in-place container deploys via Redis pub/sub, and exposes gateway-specific endpoints.

## Tech Stack
- **Runtime:** Node.js, TypeScript, Express
- **Proxy:** `http-proxy-middleware`
- **Database:** PostgreSQL via Knex (`src/db/`)
- **Cache / Pub-Sub:** Redis via `ioredis` (`src/db/redis.ts`)
- **Auth:** Internal — `x-bk-gateway-key` header verified against bcrypt hash from Secrets Manager
- **Build:** `npm run build` (compiles TypeScript to `dist/`)

## Branch & PR Rules — CRITICAL
- **Always base your branch off `dev`.** Never branch from `main`.
- **All PRs must target `dev`.** Never open a PR targeting `main`.
- `main` is production-only and is never a valid PR target under any circumstances.

## Standing Rules
- Run `npm run build` after completing changes to confirm zero TypeScript errors. **Do not run tests.**
- Never hardcode secrets, credentials, or environment-specific values — use AWS Secrets Manager only. The only allowed `process.env` reads are `AWS_REGION`, `AWS_SECRET_ARN`, and `AWS_DB_SECRET_ARN`.
- All sensitive routes must use the `protectedRoute()` middleware from `src/middleware/protectedRoute.ts`.
- Always read `src/app.ts`, `src/interfaces.ts`, `src/types.ts`, and `src/db/db.ts` before writing new routes or services.

## File Conventions
- Routes: `src/routers/<name>Router.ts`
- Middleware: `src/middleware/<name>.ts`
- DB helpers: `src/db/<name>.ts`
- Services: `src/services/<name>.ts`
- Types: `src/interfaces.ts` and `src/types.ts`
- Redis: `src/db/redis.ts`
- AWS helpers: `src/aws/<name>.ts`

## Secrets
App secrets are fetched via `src/aws/getAppSecrets.ts` from `AWS_SECRET_ARN`. The `IAPISecrets` interface in `src/interfaces.ts` defines all expected fields. When a new secret field is needed, add it to `IAPISecrets` and read it from the already-fetched `appSecrets` object passed through `app.set("secrets", appSecrets)`.

## PR Naming
The PR **branch name and title must both start with the issue number**, e.g. branch `7-add-redis-connection` and title `7 Add Redis connection`. This is required for the automation workflow.

## PR Description Format
The PR body **must** include `Closes #<issue_number>` (e.g. `Closes #7`) so the issue is automatically closed when the PR is merged.

## Commit Message Format
A single plain sentence describing what was done. No `feat:` or conventional commit prefixes.
