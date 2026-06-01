#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Starting local infrastructure..."
docker compose up -d

echo "Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U sg_user -d schemaguard >/dev/null 2>&1; do
  sleep 2
done

echo "SchemaGuard local stack is ready."
echo "Dashboard: cd frontend/dashboard && npm install && npm run dev"
