#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.relational.test.yaml"
ENV_FILE="env-example-relational"
PROJECT="tests"

cleanup() {
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down --remove-orphans || true
  docker compose -p "$PROJECT" rm -svf || true
}

trap cleanup EXIT

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" up -d --build
docker compose -f "$COMPOSE_FILE" -p "$PROJECT" exec -T api \
  /opt/wait-for-it.sh -t 0 localhost:3001 -- \
  npm run test:e2e -- --runInBand --watchAll=false
