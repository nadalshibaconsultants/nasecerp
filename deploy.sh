#!/usr/bin/env bash
# Pull the latest code from GitHub, rebuild containers, and roll the stack.
# Run this on the SERVER (not your Mac).
#   bash deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "[deploy] pulling latest from git..."
git pull --ff-only

echo "[deploy] building images..."
docker compose build --pull

echo "[deploy] restarting services..."
docker compose up -d

echo "[deploy] waiting for API health..."
for i in {1..30}; do
  if docker compose exec -T api wget -q --spider http://localhost:4000/health; then
    echo "[deploy] api healthy"
    break
  fi
  sleep 2
done

echo "[deploy] pruning old images..."
docker image prune -f >/dev/null

docker compose ps
echo "[deploy] done"
