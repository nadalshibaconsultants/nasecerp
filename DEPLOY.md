# NASEC ERP — Docker Deployment Guide

End-to-end steps for: **commit on Mac → push to GitHub → server pulls → docker rebuild → live**.

Stack: Postgres 16 + API (Express + tsx) + Web (nginx serving the Vite SPA and reverse-proxying `/api/*` + WebSocket).

---

## Part 1 — One-time setup

### 1.1 Push the code to GitHub (do this once on your Mac)

```bash
cd /Users/aziznasec/Downloads/nasec-deploy-v34b
git init                                  # skip if already a repo
git add .
git commit -m "Initial deploy-ready commit"
gh repo create nasec/erp --private --source=. --remote=origin --push
# OR if you already created the repo manually:
# git remote add origin git@github.com:nasec/erp.git
# git push -u origin main
```

### 1.2 Provision the server

Get a Linux VPS (DigitalOcean droplet, AWS EC2, Hetzner, anything). Requirements:
- Ubuntu 22.04+ (or any modern Linux with kernel ≥ 5.10)
- 2 vCPU, 4 GB RAM, 30 GB disk minimum
- Ports **80** (web) + **22** (SSH) open in the firewall
- A public IP — call it `SERVER_IP` below

### 1.3 Install Docker on the server

SSH into the server, then:

```bash
# Docker engine + compose plugin (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

Log out + back in once if `docker` still needs sudo.

### 1.4 Clone the repo on the server

```bash
# Generate a deploy key for read-only git access (one-time)
ssh-keygen -t ed25519 -C "deploy@nasec" -f ~/.ssh/nasec_deploy -N ""
cat ~/.ssh/nasec_deploy.pub
# → Copy this public key. On GitHub: Repo → Settings → Deploy keys → Add deploy key (read-only).

# Tell SSH to use this key for github
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/nasec_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# Clone
mkdir -p /opt && cd /opt
git clone git@github.com:nasec/erp.git nasec-erp
cd nasec-erp
```

### 1.5 Configure secrets on the server

```bash
cp .env.production.example .env
nano .env
```

Fill in at minimum:

```env
POSTGRES_PASSWORD=<a strong random password>
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n=')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n=')
CORS_ORIGINS=http://SERVER_IP
SEED_DIRECTOR_PASSWORD=<change me>
```

(Replace `SERVER_IP` with the actual public IP.)

### 1.6 First boot

```bash
docker compose up -d --build
docker compose logs -f api      # watch until you see "[api] listening on http://0.0.0.0:4000"
```

The API container automatically:
1. Runs Drizzle migrations (`tsx src/db/migrate.ts`)
2. Applies the RLS policies from `rls.sql`
3. Starts the Express server + WebSocket + cron jobs

### 1.7 Seed the initial director account

```bash
docker compose exec api npx tsx src/seed/initial.ts
```

Output should show: `created director: director@nasec.local / <SEED_DIRECTOR_PASSWORD>` and 4 demo employees.

### 1.8 Verify

From your Mac (or any browser):

```
http://SERVER_IP/                   ← SPA login page
http://SERVER_IP/api/v1/health      ← {"ok":true,"version":"v1"}
```

Log in with `director@nasec.local` and the password you set in `.env`.

---

## Part 2 — Day-to-day workflow

You **edit on Mac, commit, push** — then **on the server, pull and rebuild**.

### 2.1 Make changes locally on the Mac

```bash
cd /Users/aziznasec/Downloads/nasec-deploy-v34b
# edit files...
npm run dev                  # frontend at http://localhost:3001
cd server && npm run dev     # backend at http://localhost:4000

# When you're happy:
git add .
git commit -m "What changed"
git push
```

### 2.2 Deploy to the server

SSH in and run the deploy script:

```bash
ssh user@SERVER_IP
cd /opt/nasec-erp
./deploy.sh
```

That single command:
1. `git pull` — pulls your latest commit
2. `docker compose build --pull` — rebuilds only the changed images (Docker layer cache keeps this fast)
3. `docker compose up -d` — rolls the running stack
4. Waits for the API health check
5. Prunes old image layers

Typical time: **30–90 seconds** depending on what changed.

### 2.3 One-liner from your Mac (optional)

```bash
ssh user@SERVER_IP "cd /opt/nasec-erp && ./deploy.sh"
```

You can wrap this in a Makefile or a script — `make deploy` etc.

---

## Part 3 — Operational tasks

### View logs

```bash
docker compose logs -f api          # API + cron jobs
docker compose logs -f web          # nginx access logs
docker compose logs -f db           # postgres
docker compose logs --tail=100      # all services
```

### Restart one service

```bash
docker compose restart api
```

### Stop / start the whole stack

```bash
docker compose down                 # stop (volumes persist)
docker compose up -d                # start again

docker compose down -v              # ⚠ also wipes the database volume — only for a clean reset
```

### Database access

```bash
docker compose exec db psql -U nasec nasec_erp
```

### Backup

```bash
docker compose exec -T db pg_dump -U nasec nasec_erp | gzip > backup_$(date +%F).sql.gz
```

Schedule it via host cron:

```cron
0 1 * * *  cd /opt/nasec-erp && docker compose exec -T db pg_dump -U nasec nasec_erp | gzip > /var/backups/nasec_$(date +\%F).sql.gz
```

### Restore

```bash
gunzip -c backup_2026-05-25.sql.gz | docker compose exec -T db psql -U nasec nasec_erp
```

### Run an ad-hoc migration or seed

```bash
docker compose exec api npx tsx src/db/migrate.ts        # idempotent
docker compose exec api npx tsx src/seed/initial.ts      # idempotent
docker compose exec api npx tsx src/seed/from-localstorage.ts /path/to/dump.json
```

### Open a shell in the API container

```bash
docker compose exec api sh
```

---

## Part 4 — Wiring a real domain (erp.nasec.com) later

When you're ready to move from `http://SERVER_IP` to a proper domain with HTTPS:

1. **DNS**: at your domain registrar, add an A record:
   `erp.nasec.com   →   SERVER_IP`
2. **Add Caddy** in front of nginx for automatic Let's Encrypt TLS. Edit `docker-compose.yml`:

   ```yaml
     caddy:
       image: caddy:2-alpine
       restart: unless-stopped
       depends_on: [web]
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./Caddyfile:/etc/caddy/Caddyfile:ro
         - caddy_data:/data
         - caddy_config:/config
   ```
   And change `web.ports` from `"80:80"` to nothing (only Caddy is now exposed):
   ```yaml
     web:
       expose: ["80"]    # remove the ports: block
   ```
   Plus a `caddy_data: {}` and `caddy_config: {}` at the end of the volumes section.

3. **Create a `Caddyfile`** in the repo root:
   ```
   erp.nasec.com {
       reverse_proxy web:80
   }
   ```

4. **Update `.env`**:
   ```env
   CORS_ORIGINS=https://erp.nasec.com
   SECURE_COOKIES=true
   COOKIE_DOMAIN=.nasec.com
   ```

5. `./deploy.sh` — Caddy auto-provisions the TLS cert on first start.

---

## Part 5 — Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose up` fails on port 80 | Some other process is using 80. `sudo lsof -i :80` then either stop it or set `PUBLIC_HTTP_PORT=8080` in `.env` and access via `http://SERVER_IP:8080` |
| API container restarts on a loop | `docker compose logs api` — usually a missing env var (env.ts will print the failing field) |
| `relation does not exist` errors | Migration didn't run. `docker compose exec api npx tsx src/db/migrate.ts` |
| Frontend loads but login fails | Check `CORS_ORIGINS` in `.env` includes the URL you're accessing from |
| WebSocket disconnects every few seconds | Make sure nginx is the one in this repo (`nginx.conf` has the `/api/v1/realtime/` upgrade block); reverse proxies without upgrade headers will drop sockets |
| Out-of-disk after weeks | `docker image prune -af && docker volume prune` (the postgres_data + api_files volumes are protected by names — they survive prune) |

---

## File map

| File | Purpose |
|---|---|
| [docker-compose.yml](docker-compose.yml) | 3-service stack: db, api, web |
| [web.Dockerfile](web.Dockerfile) | Builds the SPA → packs into nginx |
| [nginx.conf](nginx.conf) | SPA fallback + API reverse-proxy + WebSocket upgrade |
| [server/Dockerfile](server/Dockerfile) | API runtime (tsx, auto-migrate on boot) |
| [.env.production.example](.env.production.example) | Copy → `.env` on server, fill secrets |
| [deploy.sh](deploy.sh) | Pull + build + restart, run on server |
| [GO-LIVE.md](GO-LIVE.md) | Production hardening checklist (TLS, RDS, S3, WAF, etc.) |
