# 🎵 Viking Scrobbler

Modern music scrobbling web application built with **Elixir/Phoenix** backend and **React/TypeScript** frontend with Tailwind CSS.

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/solaar45/viking-scrobbler)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ Features

- 🎵 **Navidrome-compatible** scrobbling
- 📊 **Statistics Dashboard** with charts and analytics
- 🎨 **Modern Dark Mode UI** (Glassmorphism design)
- 🚀 **Zero-Config Installation** - auto-generates secrets
- 🐳 **Single Docker Container** - runs out of the box
- 💾 **Dual Database Support** - SQLite (default) or PostgreSQL
- 📱 **Responsive Design** - works on mobile, tablet, desktop

---

## 🚀 Quick Start

### Option 1: Docker Run (Fastest - SQLite) ⭐ RECOMMENDED

docker run -d
--name viking-scrobbler
-p 4000:4000
-v viking_data:/app/data
solaar45/viking-scrobbler:latest


**That's it!** Open http://localhost:4000

---

### Option 2: Docker Compose (SQLite)

**Step 1:** Create `docker-compose.yml`

services:
app:
image: solaar45/viking-scrobbler:latest
container_name: viking-scrobbler
environment:
- DATABASE_ADAPTER=sqlite
- PORT=4000
ports:
- "4000:4000"
volumes:
- ./data:/app/data
restart: unless-stopped


**Step 2:** Start

docker compose up -d


**Step 3:** Open http://localhost:4000

---

### Option 3: Docker Compose with PostgreSQL (Power Users)

**Step 1:** Create `.env`

cat > .env << 'ENVFILE'
POSTGRES_USER=viking
POSTGRES_PASSWORD=YourSecurePassword123
POSTGRES_DB=viking_prod
PORT=4000
ENVFILE


**Step 2:** Create `docker-compose.yml`

services:
db:
image: postgres:16-alpine
container_name: viking-db
environment:
- POSTGRES_USER=${POSTGRES_USER}
- POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
- POSTGRES_DB=${POSTGRES_DB}
volumes:
- postgres_data:/var/lib/postgresql/data
restart: unless-stopped
healthcheck:
test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
interval: 10s
timeout: 5s
retries: 5

app:
image: solaar45/viking-scrobbler:latest
container_name: viking-scrobbler
depends_on:
db:
condition: service_healthy
environment:
- DATABASE_ADAPTER=postgres
- POSTGRES_HOST=db
- POSTGRES_USER=${POSTGRES_USER}
- POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
- POSTGRES_DB=${POSTGRES_DB}
- PORT=${PORT}
ports:
- "${PORT}:4000"
volumes:
- ./data:/app/data
restart: unless-stopped

volumes:
postgres_data:


**Step 3:** Start

docker compose up -d


---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_ADAPTER` | `sqlite` | No | Database type: `sqlite` or `postgres` |
| `DATABASE_PATH` | `/app/data/viking.db` | No | SQLite database file path |
| `PORT` | `4000` | No | HTTP port for web interface |
| `POSTGRES_HOST` | `db` | Yes* | PostgreSQL hostname (*only if using postgres) |
| `POSTGRES_PORT` | `5432` | No | PostgreSQL port |
| `POSTGRES_USER` | `viking` | Yes* | PostgreSQL username |
| `POSTGRES_PASSWORD` | - | Yes* | PostgreSQL password |
| `POSTGRES_DB` | `viking_prod` | Yes* | PostgreSQL database name |
| `POOL_SIZE` | `5` (sqlite) / `10` (postgres) | No | Database connection pool size |
| `SECRET_KEY_BASE` | *auto-generated* | No | Phoenix secret (generated automatically) |

### Auto-Generated Secrets

The container **automatically generates** a `SECRET_KEY_BASE` on first start and saves it to `/app/data/.secret_key_base`. This ensures:

- ✅ Sessions persist across container restarts
- ✅ No manual configuration needed
- ✅ Secure 64-byte random key

---

## 📦 Unraid Installation

### Method 1: Docker Compose (Recommended)

**Step 1:** SSH to your Unraid server

ssh root@YOUR-UNRAID-IP

mkdir -p /mnt/user/appdata/viking
cd /mnt/user/appdata/viking


**Step 3:** Create `.env` file


cat > .env << 'ENVFILE'
POSTGRES_PASSWORD=YourSecurePassword123
PORT=4000
ENVFILE


**Step 4:** Create `docker-compose.yml` (choose SQLite or PostgreSQL version from above)

**Step 5:** Start

docker compose up -d


**Step 6:** Access at `http://YOUR-UNRAID-IP:4000`

---

### Method 2: Unraid Community Apps Template

**Step 1:** Add template repository

1. Go to **Docker** tab in Unraid
2. Click **Add Container** → **Template repositories**
3. Add: `https://github.com/solaar45/viking`

**Step 2 (Optional):** Install PostgreSQL container first

If using PostgreSQL:

1. Search **PostgreSQL** in Apps
2. Install **postgres** by PostgreSQL
3. Configure:
   - Name: `viking-db`
   - POSTGRES_USER: `viking`
   - POSTGRES_PASSWORD: `YourSecurePassword`
   - POSTGRES_DB: `viking_prod`
   - Path: `/mnt/user/appdata/viking/postgres` → `/var/lib/postgresql/data`

**Step 3:** Install Viking Scrobbler

1. Search **Viking Scrobbler** in Apps
2. Configure:
   - **Port:** `4000` (or your preference)
   - **Data Directory:** `/mnt/user/appdata/viking/data`
   - **Database Adapter:** `sqlite` or `postgres`
   - If PostgreSQL:
     - **PostgreSQL Host:** `viking-db`
     - **PostgreSQL User:** `viking`
     - **PostgreSQL Password:** `YourSecurePassword`
     - **PostgreSQL Database:** `viking_prod`

**Step 4:** Access at `http://YOUR-UNRAID-IP:4000`

---

## 🏗️ Build from Source

### Prerequisites

- Elixir 1.17.3+ / Erlang 27.2+
- Node.js 22+
- Docker & Docker Compose (for containerized build)

### Local Development

**Backend:**

cd backend/app_api
Install dependencies

mix deps.get
Setup database

mix ecto.create
mix ecto.migrate
Start Phoenix server

mix phx.server


**Frontend:**

cd frontend/app_web
Install dependencies

npm install
Start dev server

npm run dev


**Access:**
- Backend API: http://localhost:4000/api
- Frontend Dev: http://localhost:5173

---

### Docker Build

Clone repository

git clone https://github.com/solaar45/viking.git
cd viking
Build image

docker compose build
Start

docker compose up -d


---

## 📊 Database Comparison

| Feature | SQLite (Default) | PostgreSQL |
|---------|------------------|------------|
| **Containers** | 1 | 2 |
| **Configuration** | Zero-config | Requires password |
| **Performance** | Good for <1000 users | Unlimited scalability |
| **Backup** | Copy volume/file | `pg_dump` |
| **Use Case** | Personal/Home use | Production/Multi-user |
| **Setup Time** | 10 seconds | 30 seconds |

**Recommendation:** Use SQLite for personal/home installations. Switch to PostgreSQL if you need high availability or multiple concurrent users.

---

## 🔄 Updates

### Docker Image

Pull latest image

docker pull solaar45/viking-scrobbler:latest
Restart container

docker compose down
docker compose up -d


Your data (database + secrets) persists in the `/app/data` volume.

---

## 🗂️ Project Structure

viking/
├── backend/
│ └── app_api/ # Phoenix API
│ ├── lib/ # Application code
│ ├── priv/ # Migrations, static files
│ ├── config/ # Configuration
│ └── entrypoint.sh # Container startup script
├── frontend/
│ └── app_web/ # React + TypeScript + Tailwind
│ ├── src/ # React components
│ └── public/ # Static assets
├── unraid-templates/ # Unraid Community Apps templates
├── Dockerfile # Multi-stage build (Frontend + Backend)
├── docker-compose.yml # SQLite deployment
└── docker-compose.postgres.yml # PostgreSQL deployment


---

## 🔐 Security

### Automatic Secret Management

- `SECRET_KEY_BASE` is auto-generated using `openssl rand -base64 64`
- Stored persistently in `/app/data/.secret_key_base`
- File permissions: `600` (read/write owner only)

### Database Passwords

**⚠️ Important:** Change default PostgreSQL passwords in production!

Generate secure password

openssl rand -base64 32


### Network

- Container exposes only port 4000 (HTTP)
- Use reverse proxy (Nginx/Traefik) with TLS for production
- Consider firewall rules for external access

---

## 🐛 Troubleshooting

### Container won't start

**Check logs:**


docker logs viking-scrobbler


**Common issues:**

1. **Port already in use:**

Change port in docker-compose.yml or .env

PORT=4001


2. **PostgreSQL not ready:**

Check PostgreSQL logs

docker logs viking-db
Verify connection

docker exec -it viking-db pg_isready -U viking


3. **Permission errors:**


Fix data directory permissions

sudo chown -R 1000:1000 ./data


### Database migration errors

Manually run migrations

docker exec -it viking-scrobbler bin/app_api eval "AppApi.Release.migrate()"


### Reset everything

Stop and remove containers

docker compose down -v
Remove data (⚠️ deletes all data!)

rm -rf ./data
Start fresh

docker compose up -d


---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Docker Hub:** https://hub.docker.com/r/solaar45/viking-scrobbler
- **GitHub:** https://github.com/solaar45/viking
- **Issues:** https://github.com/solaar45/viking/issues
- **Navidrome:** https://www.navidrome.org

---

## 📧 Support

- Open an issue: https://github.com/solaar45/viking/issues
- Discussions: https://github.com/solaar45/viking/discussions

---

**Made with ❤️ using Elixir, Phoenix, React, and Tailwind CSS**

