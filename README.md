# bk-gateway-api
## Project overview

**bk-gateway-api** is a small Node.js/Express API gateway that proxies requests to a set of internal microservices (e.g., `portfolio-api`, `wmsfo-api`) and exposes a few local endpoints for health, leadership information and lightweight utilities. It’s implemented in TypeScript and designed for production deployments (containerized) behind a load balancer.

## Purpose and responsibilities

- Proxy requests to downstream services with keep-alive agents and sensible timeouts.
- Provide an aggregated health check for included services.
- Expose local endpoints used for operations and diagnostics (leader info, EC2 launch records, utilities).
- Enforce minimal security headers and CORS policy.

## Tech stack

- Node.js (TypeScript)
- Express
- http-proxy-middleware
- Knex + pg for DB access
- Jest + Supertest for tests

## Folder structure

- `src/`
  - `app.ts` — Express app (mounts routes and proxies)
  - `index.ts` — production entrypoint (initializes secrets, DB, and services)
  - `routers/` — Express routers (`healthRouter`, `aboutMeRouter`, `ec2LaunchRouter`, `utilsRouter`)
  - `db/` — persistence helpers (EC2 launch records, DB init)
  - `services/` — utilities like `leaderElectionService` and `instanceMetadataService`
  - `aws/` — helpers that fetch secrets from AWS Secrets Manager
  - `config/` — `serviceMap` used by the gateway for proxy targets
  - `middleware/` — e.g. `protectedRoute`

## Environment variables

The service expects the following environment variables (documented here as used in the codebase):

- `PORT` — port the gateway listens on (defaults to 3000)
- `NODE_ENV` — `production` or `development`
- `IS_LOCAL` — set to any value in local dev to enable `morgan` and local service URLs
- `AWS_REGION` — region for Secrets Manager requests
- `AWS_SECRET_ARN` — ARN for app configuration secrets (optional depending on deployment)
- `AWS_DB_SECRET_ARN` — ARN for DB secrets
- `FORCE_LEADER` — optional ("true") to force leader election to succeed in dev

If secrets are not present, local dev mode will try to run without AWS Secrets (some endpoints that depend on secrets or DB may be limited).

> Note: When testing the Express app in-unit tests, we import `src/app.ts` directly to avoid running `index.ts` startup logic that depends on AWS or DB.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build and run in dev:

   ```bash
   npm run dev
   ```

3. Or build & run production (locally):

   ```bash
   npm run build
   PORT=3000 npm start
   ```

4. Run tests:

   ```bash
   npm test
   ```

## Running in Docker / Deployment

A `Dockerfile` is included for containerization. Typical deployment options:

- Amazon ECS / AWS Fargate: build image, push to ECR, define task with healthy checks and load balancer.
- Kubernetes: build image, deploy with liveness/readiness probes and horizontal pod autoscaling.

Key deployment considerations:

- The gateway uses `serviceMap` to determine downstream hosts. In production, services are typically addressed by DNS within the same network (e.g., `wmsfo-api:3003`). In local dev, the gateway points to `localhost:<port>`.
- Configure health checks and timeouts (the gateway uses a 3s per-service health check timeout).

## Security, scaling, and architecture notes

- **Security**: minimal headers are added using `helmet`. Protected routes use `protectedRoute()` and should be behind proper authentication or limited to internal networks. The gateway expects secrets (e.g., `master_password_hash`, `protected_route_prefix`) to be provided via AWS Secrets Manager in production.
- **Scaling**: the gateway uses keep-alive HTTP(S) agents with high `maxSockets` to reduce connection overhead when proxying. For high traffic, scale the gateway horizontally and ensure downstream services scale accordingly. Use a load balancer with readiness/liveness probes that point at `/api/health`.
- **Observability**: enable logging and add monitoring on the `gateway-info` and `/api/health` endpoints. Ship metrics to CloudWatch or your observability stack.

### Leader election (how it works)

The gateway coordinates a simple leader election among running gateway instances using a small Postgres-backed protocol:

- On startup the instance records its identity (`instance_id`, `public_ip`, `private_ip`) in the `ec2_launch` table (insert).
- Every 5 seconds the gateway runs an `evaluate()` routine that:
  - Deletes stale instances from `ec2_launch` (those with old/no heartbeats). The default stale threshold is 15 seconds in code (config variable `STALE_INSTANCE_THRESHOL_SECONDS`).
  - Checks for a heartbeat for the current instance; if present, it `beat()`s (updates heartbeat timestamp). If no instance record exists yet, it inserts one.
  - If requested (`FORCE_LEADER=true`) the instance will force itself to be the leader by writing a special value (via `forceLeader`) that clears other leaders and sets this instance as leader.
  - Otherwise leader selection is deterministic: the instance with the oldest `launched_at` timestamp becomes leader (via `updateIsLeader`).
- The `about-me` endpoint (`GET /api/about-me`) exposes `amILeader`, `myInstanceId`, and IP addresses to help operators verify leadership.

This simple approach relies on a shared DB (Postgres) and short heartbeat intervals and is robust for small fleets where there is a single leader at a time.

### AWS deployment & bootstrap notes

This project is typically deployed as a Docker image pulled from ECR and run on EC2 instances (or orchestrated by ECS/EKS). The project's EC2 bootstrap (example) demonstrates common ops steps:

- Install Docker, CloudWatch agent, and dependencies; configure Docker daemon log rotation.
- Allow IMDS (169.254.169.254) access via iptables so instance metadata can be read by the process that initializes `instanceMetadataService`.
- Pull images from ECR and run containers on a user-defined Docker network (example network: `app-net`) with predictable container names and ports (`portfolio-api:3001`, `wmsfo-api:3003`, `bk-gateway-api:3000` on the host).
- Configure and start the CloudWatch agent to collect memory and custom metrics.

Example bootstrap snippet (ops already used in this stack):

- `aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR`
- `docker network create app-net || true` and then `docker run -d --name bk-gateway-api --network app-net -p 80:3000 <image>`

Operational notes:
- Ensure Secrets Manager values (app and DB secrets) are available to the container at startup; the gateway reads Secrets Manager to populate `app.set("secrets", ...)` at launch.
- In production, run a single leader-sensitive job (if any) only on the leader instance or implement idempotent operations.
- Use ASG health checks and CloudWatch alarms to detect unhealthy instances and rely on the DB-based leader election to elect a new leader quickly.

## Tests

Unit tests are implemented with Jest + Supertest in `__tests__/`. Tests import `src/app.ts` directly and mock external dependencies (node-fetch, database modules, services) so they can run quickly in CI.

## Assumptions and notes

- The repo contains a number of small microservices that are expected to be reachable using `serviceMap` in `src/config/serviceMap.ts`.
- `index.ts` performs long-running startup tasks (secrets, DB, leader election). For tests we avoid executing that file.

---