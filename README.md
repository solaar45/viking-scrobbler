# Viking Scrobbler

A modern music scrobbling service built with Elixir/Phoenix and React. Viking Scrobbler provides a ListenBrainz-compatible API for tracking your listening history with an elegant web dashboard for visualizing your music statistics.

![Docker Pulls](https://img.shields.io/docker/pulls/solaar45/viking-scrobbler)
![GitHub Stars](https://img.shields.io/github/stars/solaar45/viking-scrobbler)
![License](https://img.shields.io/github/license/solaar45/viking-scrobbler)

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Deployment Scenarios](#deployment-scenarios)
  - [Docker Compose (Recommended)](#1-docker-compose-recommended)
  - [Unraid](#2-unraid)
  - [Custom Server](#3-custom-server-production)
  - [Development Setup](#4-development-setup)
- [Configuration](#configuration)
- [Navidrome Integration](#navidrome-integration)
- [Dashboard Features](#dashboard-features)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

- 🎵 **ListenBrainz API v1** compatible endpoints
- 🎼 **Navidrome** subsonic scrobbling support with genre enrichment
- 🔐 **Token-based authentication** for secure API access
- 📊 **Real-time statistics** with WebSocket updates
- 🕒 **Time-based filtering** (Last 7 Days, 30 Days, Year, All Time)
- 📈 **Smart activity grouping** (daily/weekly/monthly/yearly)
- 🎨 **Modern responsive dashboard** built with React + Tailwind
- 💾 **SQLite database** (no external database required)
- 🐳 **Docker-ready** with multi-stage builds
- 🖥️ **Unraid-compatible** with simple setup

---

## Architecture

### Backend
- Elixir 1.17.3
- Phoenix Framework 1.7+
- Ecto with SQLite3
- JSON API (no server-side rendering)
- CORS enabled for frontend communication

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)

### Deployment
- Multi-stage Docker build
- Nginx for static file serving
- Hot-reload support in development

## Prerequisites

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+

### For Development
- Elixir 1.17.3 or higher
- Erlang/OTP 26+
- Node.js 20+
- SQLite3

---

## 🚀 Quick Start

**Get Viking Scrobbler running in 60 seconds:**

```bash
# 1. Pull the image
docker pull solaar45/viking-scrobbler:latest

# 2. Create a secure secret key
export SECRET_KEY_BASE=$(openssl rand -base64 48)

# 3. Start the container
docker run -d \
  --name viking-scrobbler \
  -p 4000:4000 \
  -e SECRET_KEY_BASE="$SECRET_KEY_BASE" \
  -v viking_data:/app/data \
  solaar45/viking-scrobbler:latest

# 4. Access the dashboard
open http://localhost:4000
```

---

## 📦 Deployment Scenarios

### 1. Docker Compose (Recommended)

**Best for:** Home servers, development, testing

#### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/solaar45/viking-scrobbler.git
cd viking-scrobbler
```

2. **Copy and customize environment variables:**
```bash
cp .env.example .env
nano .env  # Edit with your settings
```

**Minimal `.env`:**
```env
SECRET_KEY_BASE=generate_with_openssl_rand_base64_48
DATA_PATH=viking_data  # Uses Docker named volume
```

3. **Start the service:**
```bash
docker-compose up -d
```

4. **Access:**
- Dashboard: `http://localhost:4000`
- API: `http://localhost:4000/1/`

#### Stop/Update

```bash
# Stop
docker-compose down

# Update to latest version
docker-compose pull
docker-compose up -d
```

---

### 2. Unraid

**Best for:** Unraid servers with persistent storage

#### Method A: Docker Compose

1. **Create app directory:**
```bash
mkdir -p /mnt/user/appdata/viking-scrobbler
cd /mnt/user/appdata/viking-scrobbler
```

2. **Download `docker-compose.yml` and `.env.example`:**
```bash
wget https://raw.githubusercontent.com/solaar45/viking-scrobbler/main/docker-compose.yml
wget https://raw.githubusercontent.com/solaar45/viking-scrobbler/main/.env.example
```

3. **Create `.env` file:**
```bash
cp .env.example .env
nano .env
```

**Unraid-specific `.env`:**
```env
# Use host path for persistent storage
DATA_PATH=/mnt/user/appdata/viking-scrobbler/data

# Generate secure key
SECRET_KEY_BASE=your_64_character_random_string_here

# Optional: Custom port if 4000 is taken
PORT=4000
BIND_IP=0.0.0.0
```

4. **Start container:**
```bash
docker-compose up -d
```

#### Method B: Unraid Template (Coming Soon)

Download `viking-scrobbler.xml` and place in:
```
/boot/config/plugins/dockerMan/templates-user/
```

---

### 3. Custom Server (Production)

**Best for:** VPS, dedicated servers, custom setups

#### Setup

1. **Create directory structure:**
```bash
sudo mkdir -p /opt/viking-scrobbler/data
cd /opt/viking-scrobbler
```

2. **Create `.env` file:**
```bash
cat > .env << EOF
DATA_PATH=/opt/viking-scrobbler/data
SECRET_KEY_BASE=$(openssl rand -base64 48)
PORT=4000
BIND_IP=0.0.0.0
EOF
```

3. **Download `docker-compose.yml`:**
```bash
wget https://raw.githubusercontent.com/solaar45/viking-scrobbler/main/docker-compose.yml
```

4. **Start service:**
```bash
docker-compose up -d
```

#### Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name scrobbler.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 4. Development Setup

**Best for:** Contributing, testing, customization

#### Prerequisites
- Elixir 1.16+ & Erlang/OTP 26+
- Node.js 20+
- SQLite3

#### Backend Setup

```bash
cd backend

# Install dependencies
mix deps.get

# Create database
mix ecto.create
mix ecto.migrate

# Start Phoenix server
mix phx.server
```

Backend runs at: `http://localhost:4000`

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## ⚙️ Configuration

### Environment Variables Reference

Create a `.env` file based on `.env.example`:

```env
# === Data Storage ===
# Docker named volume (default)
DATA_PATH=viking_data

# OR: Host path for Unraid/Production
# DATA_PATH=/mnt/user/appdata/viking-scrobbler/data
# DATA_PATH=/opt/viking-scrobbler/data

# === Security ===
# Generate with: openssl rand -base64 48
SECRET_KEY_BASE=your_64_character_minimum_random_string

# === Network ===
PORT=4000
BIND_IP=0.0.0.0

# Only set if you have IPv6 binding issues
# PHX_HOST=0.0.0.0

# === Navidrome Integration (Optional) ===
# Leave empty for auto-discovery or manual setup via Web UI
# NAVIDROME_URL=http://localhost:4533
# NAVIDROME_USERNAME=your_username
# NAVIDROME_PASSWORD=your_password
```

### Docker Compose Configuration

The `docker-compose.yml` uses environment variables with sensible defaults:

```yaml
services:
  viking-scrobbler:
    image: solaar45/viking-scrobbler:latest
    ports:
      - "${BIND_IP:-0.0.0.0}:${PORT:-4000}:4000"
    volumes:
      - ${DATA_PATH:-viking_data}:/app/data
    environment:
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      # ... other settings
```

**Key features:**
- ✅ Works without `.env` (uses defaults)
- ✅ Customizable via `.env` file
- ✅ Supports both Docker volumes and host paths
- ✅ Health checks included

---

## 🎵 Navidrome Integration

Viking Scrobbler integrates seamlessly with Navidrome for automatic genre enrichment and scrobbling.

### Setup in Navidrome

1. **Open Navidrome settings**
2. Navigate to **"Last.fm / ListenBrainz"**
3. Configure:
   - **Scrobbler:** ListenBrainz
   - **API URL:** `http://your-viking-server:4000`
   - **Token:** Generate in Viking dashboard (Settings → Token Management)
4. **Test Connection** → Should show "✅ Connected"
5. **Enable scrobbling**

### Genre Enrichment

Viking Scrobbler automatically enriches listens with genres from:
1. **Navidrome ID3 tags** (primary source)
2. **MusicBrainz API** (fallback)

**Features:**
- Zero-configuration auto-discovery
- Hybrid credential resolution (DB → ENV → Auto-scan)
- Background enrichment pipeline
- Rate-limited API calls

---

## 🎨 Dashboard Features

### Overview Section
- **Real-time statistics** with live updates
- **Time-based filtering:** Week, Month, Year, All Time
- **Key metrics:**
  - Total Scrobbles
  - Unique Artists
  - Unique Tracks
  - Unique Albums

### Activity Chart
Smart grouping based on time range:
- **Week:** Daily breakdown
- **Month:** Weekly breakdown
- **Year:** Monthly breakdown
- **All Time:** Yearly overview

### Top Lists
- **Top Artists** with play counts
- **Top Tracks** with artist info
- **Top Albums** with metadata

### Recent Listens
Real-time table with:
- Track, Artist, Album
- Release Year
- Genres (from Navidrome/MusicBrainz)
- Timestamp with configurable format
- Duration

### Settings
- **Token Management:** Generate/revoke API tokens
- **DateTime Format:** Customize date/time display
- **Navidrome Setup:** Connect to your music server

---

## 📚 API Documentation

Viking Scrobbler implements the **ListenBrainz API v1** specification.

### Authentication

All endpoints require a token in the Authorization header:
```http
Authorization: Token YOUR_TOKEN_HERE
```

### Core Endpoints

#### Submit Listens
```bash
POST /1/submit-listens
Content-Type: application/json

{
  "listen_type": "single",
  "payload": [{
    "listened_at": 1734747840,
    "track_metadata": {
      "track_name": "Song Title",
      "artist_name": "Artist Name",
      "release_name": "Album Name"
    }
  }]
}
```

#### Get Recent Listens
```bash
GET /1/user/{user_name}/listens?count=25&max_ts=1234567890
```

#### Get Statistics
```bash
# Totals
GET /1/stats/user/{user_name}/totals?range=week

# Top Artists
GET /1/stats/user/{user_name}/artists?range=month&count=10

# Top Tracks
GET /1/stats/user/{user_name}/recordings?range=year&count=10

# Listening Activity
GET /1/stats/user/{user_name}/listening-activity?range=all_time
```

#### Validate Token
```bash
GET /1/validate-token
Authorization: Token YOUR_TOKEN_HERE
```

### Time Range Parameters

| Parameter | Description |
|-----------|-------------|
| `week` | Last 7 days |
| `month` | Last 30 days |
| `year` | Last 365 days |
| `all_time` | All historical data (default) |

---

## 🏗️ Project Structure

```
viking-scrobbler/
├── backend/              # Elixir/Phoenix API
│   ├── lib/
│   │   ├── app_api/      # Core business logic
│   │   └── app_api_web/  # Controllers, views, router
│   ├── priv/
│   │   └── repo/         # Database migrations
│   └── mix.exs
├── frontend/             # React/TypeScript UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities
│   │   └── main.tsx
│   └── package.json
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Universal deployment config
├── .env.example          # Environment variables template
└── README.md
```

---

## 🐛 Troubleshooting

### Common Issues

#### Container won't start
```bash
# Check logs
docker logs viking-scrobbler

# Common causes:
# - Port 4000 already in use
# - Missing SECRET_KEY_BASE
# - Insufficient permissions on data directory
```

#### Database locked error
```bash
# Stop all instances
docker-compose down

# Remove lock file
rm -f /path/to/data/viking.db-shm
rm -f /path/to/data/viking.db-wal

# Restart
docker-compose up -d
```

#### Can't connect from Navidrome
```bash
# Check if container is running
docker ps | grep viking

# Test API endpoint
curl http://localhost:4000/api/health

# Check firewall rules (if on different hosts)
sudo ufw status
```

#### Frontend shows "Failed to fetch"
```bash
# Verify backend is accessible
curl -I http://localhost:4000

# Check browser console for CORS errors
# Backend should allow all origins in production
```

#### Token validation fails
1. Regenerate token in dashboard Settings
2. Ensure token is sent as: `Authorization: Token YOUR_TOKEN`
3. Check token hasn't been revoked

### Debug Mode

Enable verbose logging:
```bash
docker-compose down
docker-compose up  # Without -d to see logs
```

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- **Backend:** Follow Elixir style guide, run `mix format`
- **Frontend:** Use ESLint + Prettier
- **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/)

### Running Tests

```bash
# Backend tests
cd backend && mix test

# Frontend tests
cd frontend && npm test

# Docker build test
docker build -t viking-test .
```

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [ListenBrainz](https://listenbrainz.org/) for API specification
- [Navidrome](https://www.navidrome.org/) for subsonic API inspiration
- [Phoenix Framework](https://www.phoenixframework.org/) team
- [React](https://react.dev/) and [Vite](https://vitejs.dev/) communities

---

## 📞 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/solaar45/viking-scrobbler/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/solaar45/viking-scrobbler/discussions)
- 📖 **Documentation:** This README + inline code comments

---

## 🗺️ Roadmap

- [ ] Multi-user support with registration
- [ ] Enhanced MusicBrainz metadata enrichment
- [ ] Export functionality (CSV, JSON)
- [ ] Advanced analytics and insights
- [ ] Mobile app (React Native)
- [ ] Last.fm API compatibility
- [ ] Spotify integration
- [ ] Docker Hub automated builds

---

**Made with ❤️ by the Viking Scrobbler community**

⭐ Star this repo if you find it useful!