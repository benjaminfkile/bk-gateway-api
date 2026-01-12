# Deployment & Operations — bk-gateway-api

This document captures the recommended EC2 / container bootstrap and operational steps used by the deployment for the gateway service. It is intended as an ops runbook and reference.

## Overview
- The gateway proxies traffic to internal microservices and participates in a **DB-backed leader election** (see Leader Election) used to coordinate leader-only responsibilities.
- Typical deployment: Docker image published to ECR and run on EC2 instances (ASG) or orchestrated by ECS/EKS.

## Prerequisites & IAM
- EC2 instances should have an IAM role with permissions for:
  - ECR (GetAuthorizationToken, BatchGetImage, GetDownloadUrlForLayer)
  - Secrets Manager (GetSecretValue)
  - S3 (if used by downstream services)
  - CloudWatch (PutMetricData, logs)
- Ensure your VPC allows access to the RDS/Postgres instance used by `ec2_launch`/`ec2_heartbeat` (private subnet / security group rules).

## Bootstrap (example)
- The production bootstrap used by the fleet includes:
  - Installing Docker, AWS CLI, CloudWatch Agent, Postgres client
  - Configuring Docker daemon `json-file` log rotation
  - Allowing IMDS (169.254.169.254) access via iptables so the instance metadata service is reachable
  - Logging into ECR and pulling images
  - Creating an internal Docker network (example: `app-net`) and running containers

Example (excerpt):

```bash
# allow IMDS
iptables -A OUTPUT -d 169.254.169.254 -j ACCEPT || true
iptables -A INPUT -s 169.254.169.254 -j ACCEPT || true

# login to ECR
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR"

docker network create app-net || true

# run gateway (host port 80 -> container 3000)
docker run -d --name bk-gateway-api --network app-net -p 80:3000 $ECR/benkile/bk-gateway-api:latest
```

> Tip: keep container names stable (e.g., `bk-gateway-api`) so other containers and health checks can reference them.

## Environment variables & secrets
- Use AWS Secrets Manager for: app secrets (`AWS_SECRET_ARN`), DB credentials (`AWS_DB_SECRET_ARN`). The gateway reads these at startup and sets `app.set('secrets', ...)`.
- Important env vars that must be supplied:
  - `NODE_ENV` (production/local)
  - `IS_LOCAL` (optional)
  - `AWS_REGION`
  - `AWS_SECRET_ARN` (app secrets)
  - `AWS_DB_SECRET_ARN` (DB credentials)
  - `FORCE_LEADER` (dev/test only; `true` forces leader behavior)

## Health checks and load balancer
- Configure the load balancer health check (e.g., ALB target group) to use `/api/health` on port 80 (STS), 10–30s interval and a short timeout (3–5s) for quicker failure detection.
- Optionally use the `/` root or `/api/gateway-info` for basic instance-level checks.

## Leader election (how it works)
- On startup, the gateway writes an `ec2_launch` row for the instance (instance id, public/private IPs).
- Every 5 seconds the gateway runs an `evaluate()` routine to:
  - Remove stale instances from `ec2_launch` (default threshold 15s — `STALE_INSTANCE_THRESHOL_SECONDS`).
  - Insert or update the instance heartbeat (`ec2_heartbeat`) and evaluate leadership.
  - If `FORCE_LEADER=true` an instance can force itself to be leader via `forceLeader()`.
  - Otherwise the oldest `launched_at` instance is elected leader by the DB-written `is_leader` flag.
- The `GET /api/about-me` endpoint shows `amILeader` and instance details for quick verification.

Operational notes for leader-sensitive work
- Keep leader-only scheduled tasks idempotent if possible.
- For critical leader work, use `forceLeader` only with operational oversight (it writes across instances to clear leader flags).
- When replacing instances via rolling update or ASG, ensure graceful shutdown and rely on the DB-based election to pick a new leader automatically.

## Monitoring & CloudWatch
- Install CloudWatch Agent with a small JSON config to collect `mem_used_percent` and host-level metrics. Use CloudWatch alarms for memory/cpu and metric-based health signal.
- Create alarms to alert on `/api/health` failures, repeated 5xxs, or significantly degraded service response times.

Example CloudWatch JSON snippet uses `AutoScalingGroupName` as a dimension and collects memory usage.

## Rolling updates & deployments
- Canary or blue/green deployments are recommended for zero-downtime updates.
- Minimal rolling update example (docker on EC2): pull the new image, stop old container, start new container, wait for health checks to pass.
- When using an ASG, replace instances in small batches and verify leader failover behavior.

## Troubleshooting & common recovery steps
- Verify logs: `docker logs bk-gateway-api` and CloudWatch logs.
- Confirm secrets are present: call `/api/about-me` (should not return 500 due to missing secrets), or check startup logs where the app logs `secrets` resolution errors.
- If leader is stuck, inspect `ec2_launch`/`ec2_heartbeat` rows and verify current `is_leader` and `launched_at` timestamps.

---
