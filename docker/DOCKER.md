# Docker — Khata Frontend

All Docker-related files live in this `docker/` folder.

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production image (Angular SSR) |
| `Dockerfile.dockerignore` | Files excluded from the build context |
| `docker-compose.yml` | Build + run the container |
| `.env.example` | Sample environment variables |
| `DOCKER.md` | This guide |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) Engine
- [Docker Compose](https://docs.docker.com/compose/) v2 (`docker compose`)
- Backend (`khata-backend`) running and reachable (default: `http://localhost:3000`)

## Quick start

```bash
# From the project root
cd /path/to/khata-frontend

# Enter docker folder
cd docker

# 1) (Optional) copy env defaults
cp .env.example .env

# 2) Build image and start container in the background
docker compose up -d --build

# 3) Open the app
# http://localhost:4000
```

### From project root (without `cd docker`)

```bash
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d --build
```

## Step-by-step

### 1. Install Docker

```bash
docker --version
docker compose version
```

### 2. Configure API URL (optional)

The production build embeds `API_BASE_URL` (default `http://localhost:3000`).

Edit `docker/.env` if needed:

```env
FRONTEND_PORT=4000
API_BASE_URL=http://localhost:3000
```

> **Note:** `API_BASE_URL` is used by the **browser**, not by the container network.
> So `localhost` means the machine running the browser (usually fine when backend is on the same host).

### 3. Build the image

```bash
cd docker
docker compose build
```

Or build + start together:

```bash
cd docker
docker compose up -d --build
```

### 4. Run / start the container

```bash
cd docker
docker compose up -d
docker compose logs -f frontend
```

### 5. Open the app

- Frontend: **http://localhost:4000**
- Backend (must be up separately): **http://localhost:3000**

### 6. Stop / remove

```bash
cd docker
docker compose down

# Also remove the built image
docker compose down --rmi local
```

## Useful commands

Run these from the `docker/` directory (or pass `-f docker/docker-compose.yml` from the project root).

| Command | Description |
|--------|-------------|
| `docker compose ps` | Container status |
| `docker compose logs -f` | Stream logs |
| `docker compose restart` | Restart frontend |
| `docker images \| grep khata-frontend` | List image |
| `docker exec -it khata-frontend sh` | Shell inside container |

## Rebuild after code changes

```bash
cd docker
docker compose up -d --build
```

If only the API URL changed, rebuild so it is baked into the JS bundle:

```bash
cd docker
API_BASE_URL=http://YOUR_HOST:3000 docker compose up -d --build
```

## How the image works

1. **Build stage** — `npm ci` + `npm run build` (Angular SSR production)
2. **Runtime stage** — Node 22 Alpine runs  
   `node dist/khata-frontend/server/server.mjs` on port **4000**

Build context is the **project root** (`..` from this folder) so the image can copy `package.json` and `src/`.

## Troubleshooting

**Blank API / network errors**  
- Confirm backend is running on the URL in `API_BASE_URL`.  
- Rebuild after changing `API_BASE_URL` (it is compile-time).

**Port already in use**  
```bash
cd docker
FRONTEND_PORT=4200 docker compose up -d --build
```

**Build fails (memory / OOM)**  
Increase Docker memory limit, or build on a machine with more RAM.
