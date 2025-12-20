# 🎵 Viking Scrobbler

Minimal music scrobbler with an Elixir/Phoenix backend and a React/TypeScript frontend.

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/solaar45/viking-scrobbler)

---

## Quick start (recommended)

1) Run the official image (uses SQLite by default):

```sh
docker run -d \
   --name viking-scrobbler \
   -p 4000:4000 \
   -v viking_data:/app/data \
   solaar45/viking-scrobbler:latest
```

Open http://localhost:4000

Or start with Docker Compose (local data at `./data`):

```sh
# in project root
docker compose up -d
```

---

## Configuration

Set environment variables in a `.env` file or your container manager:

- `DATABASE_ADAPTER` — `sqlite` (default)
- `DATABASE_PATH` — path to SQLite DB (default `/app/data/viking.db`)
- `PORT` — HTTP port (default `4000`)
- `POOL_SIZE` — DB pool size (default `5`)

`SECRET_KEY_BASE` is generated automatically on first start and stored in `/app/data/.secret_key_base`.

---

## Unraid

Use the Docker Compose method above or install via Unraid Community Apps. Set the data directory to `/mnt/user/appdata/viking/data`.

---

## Development (from source)

Backend (Phoenix):

```sh
cd backend/app_api
mix deps.get
mix phx.server
```

Frontend (Vite):

```sh
cd frontend/app_web
npm install
npm run dev
```

Frontend dev: http://localhost:5173

---

## Updates

Pull the latest image and restart:

```sh
docker pull solaar45/viking-scrobbler:latest
docker compose down
docker compose up -d
```

Data and secrets are kept in `/app/data` (or the volume you mounted).

---

## Project layout

viking/
- backend/         # Phoenix API
- frontend/        # React app
- Dockerfile
- docker-compose.yml
- unraid-templates/

---

## Troubleshooting

- Container logs: `docker logs viking-scrobbler`
- Change port via `PORT` in `.env` if needed
- Fix permissions: `sudo chown -R 1000:1000 ./data`


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

