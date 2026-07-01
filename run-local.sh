#!/usr/bin/env bash
# Local dev helper. Two modes:
#
#   ./run-local.sh dev    →  Fast: npm-based dev servers with hot reload.
#                             Postgres still runs in Docker. API on :4000, web on :3001.
#                             Use this for everyday coding.
#
#   ./run-local.sh prod   →  Full Docker stack (matches what runs on the server).
#                             API + web + db all in containers. Single port: http://localhost
#                             Use this before pushing to confirm the deploy will work.
#
#   ./run-local.sh stop   →  Stop everything (docker + node processes).
#
#   ./run-local.sh logs   →  Tail logs from the current mode.
#
# Login: director@nasec.local / ChangeMe!123
set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-}"

start_db() {
  if ! docker compose ps db --status running 2>/dev/null | grep -q nasec_db; then
    echo "[run-local] starting postgres container..."
    docker compose up -d db
    until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-nasec}" >/dev/null 2>&1; do sleep 1; done
  fi
}

case "$MODE" in
  dev)
    [ -f server/.env ] || { echo "Missing server/.env — run: cd server && cp .env.example .env && openssl rand -base64 48 | tr -d '=\n' | (read s; sed -i '' \"s|JWT_SECRET=.*|JWT_SECRET=\$s|\" .env); openssl rand -base64 48 | tr -d '=\n' | (read s; sed -i '' \"s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\$s|\" .env)"; exit 1; }
    start_db
    [ -d server/node_modules ] || (cd server && npm install)
    [ -d node_modules ] || npm install --legacy-peer-deps

    # Apply any new migrations
    (cd server && npm run db:migrate)
    (cd server && npm run seed:initial) || true

    # Kill any prior instance
    lsof -ti:4000 -ti:3001 -ti:5173 2>/dev/null | xargs -r kill 2>/dev/null || true

    (cd server && npm run dev) > /tmp/nasec-api.log 2>&1 &
    npm run dev > /tmp/nasec-web.log 2>&1 &
    sleep 4
    echo ""
    echo "  API     → http://localhost:4000  (logs: tail -f /tmp/nasec-api.log)"
    echo "  Web     → http://localhost:3001  (logs: tail -f /tmp/nasec-web.log)"
    echo "  DB      → localhost:5432  (docker container nasec_db)"
    echo ""
    echo "  Login   → director@nasec.local / ChangeMe!123"
    echo ""
    echo "  Stop with:  ./run-local.sh stop"
    ;;

  prod)
    [ -f .env ] || { echo "Missing .env — run: cp .env.production.example .env  (then edit it)"; exit 1; }
    # Stop dev-mode node processes if any
    lsof -ti:4000 -ti:3001 -ti:5173 2>/dev/null | xargs -r kill 2>/dev/null || true
    docker compose up -d --build
    docker compose ps
    echo ""
    echo "  All-in-one → http://localhost  (single port via nginx)"
    echo ""
    echo "  Logs:       docker compose logs -f api"
    echo "  Stop with:  ./run-local.sh stop"
    ;;

  stop)
    lsof -ti:4000 -ti:3001 -ti:5173 2>/dev/null | xargs -r kill 2>/dev/null || true
    docker compose down
    echo "[run-local] stopped"
    ;;

  logs)
    if docker compose ps api --status running 2>/dev/null | grep -q nasec_api; then
      docker compose logs -f
    else
      echo "==== API ===="; tail -50 /tmp/nasec-api.log
      echo "==== WEB ===="; tail -50 /tmp/nasec-web.log
    fi
    ;;

  *)
    grep '^#' "$0" | sed 's|^# \{0,1\}||' | head -20
    exit 1
    ;;
esac
