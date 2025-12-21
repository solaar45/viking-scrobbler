# Viking Scrobbler

A modern music scrobbling service built with Elixir/Phoenix and React. Viking Scrobbler provides a ListenBrainz-compatible API for tracking your listening history with an elegant web dashboard for visualizing your music statistics.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Docker Deployment (Recommended)](#docker-deployment-recommended)
  - [Development Setup](#development-setup)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Token Management](#token-management)
  - [Navidrome Integration](#navidrome-integration)
  - [API Endpoints](#api-endpoints)
- [Dashboard Features](#dashboard-features)
- [Development](#development)
  - [Backend Development](#backend-development)
  - [Frontend Development](#frontend-development)
  - [Database](#database)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- ListenBrainz API v1 compatible endpoints
- Navidrome subsonic scrobbling support
- Token-based authentication
- Real-time listening statistics
- Time-based filtering (Last 7 Days, Last 30 Days, Last 365 Days, All Time)
- Smart activity grouping (daily, weekly, monthly, yearly)
- Modern responsive web dashboard
- SQLite database (no external database required)
- Docker support for easy deployment
- Unraid-ready with docker-compose

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

## Installation

### Docker Deployment (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/viking-scrobbler.git
cd viking-scrobbler
```

2. Create data directory:
```bash
mkdir -p data
```

3. Start the containers:
```bash
docker-compose up -d
```

4. Access the dashboard:
```
http://localhost:3000
```

5. Access the API:
```
http://localhost:4000
```

### Development Setup

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend/app_api
```

2. Install dependencies:
```bash
mix deps.get
```

3. Create and migrate database:
```bash
mix ecto.create
mix ecto.migrate
```

4. Start Phoenix server:
```bash
mix phx.server
```

Backend will be available at `http://localhost:4000`

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend/app_web
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Backend
PHX_HOST=localhost
PHX_PORT=4000
SECRET_KEY_BASE=your_secret_key_here
DATABASE_PATH=/data/viking.db

# Frontend
VITE_API_URL=http://localhost:4000
```

### Docker Compose Configuration

The `docker-compose.yml` can be customized for your environment:

```yaml
services:
  viking-scrobbler:
    ports:
      - "3000:80"      # Frontend
      - "4000:4000"    # Backend API
    volumes:
      - ./data:/data   # Database persistence
```

### Unraid Configuration

For Unraid deployment, use the provided `docker-compose.yml`:

1. Place the project in `/mnt/user/appdata/viking-scrobbler/`
2. Map ports as needed in Unraid Docker settings
3. Ensure `/data` volume is mapped for database persistence

## Usage

### Token Management

1. Open the web dashboard
2. Click "Setup" button in the top-right corner
3. Generate a new API token
4. Copy the token for use with Navidrome or other clients

### Navidrome Integration

Configure Navidrome to use Viking Scrobbler:

1. In Navidrome settings, go to "Last.fm/ListenBrainz"
2. Select "ListenBrainz" as the scrobbler
3. Set API URL: `http://your-server:4000`
4. Enter your Viking Scrobbler token
5. Click "Test" to verify connection
6. Enable scrobbling

### API Endpoints

#### Submit Listens
```bash
POST /1/submit-listens
Authorization: Token YOUR_TOKEN_HERE
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
GET /1/user/:user_name/listens?count=25
```

#### Get User Statistics
```bash
GET /1/stats/user/:user_name/totals?range=week
GET /1/stats/user/:user_name/artists?range=month&count=10
GET /1/stats/user/:user_name/recordings?range=year&count=10
GET /1/stats/user/:user_name/listening-activity?range=all_time
```

## Dashboard Features

### Filtered Statistics Section
Time-based filtering for:
- Total Scrobbles
- Unique Artists
- Unique Tracks
- Unique Albums
- Smart Activity Chart (daily/weekly/monthly/yearly grouping)
- Top Artists and Tracks

### Lifetime Statistics Section
Always displays all-time data:
- Most Active Day of Week
- Average Listens per Day
- Peak Day Count
- Current Listening Streak
- Recent Listens (last 20 tracks)

## Development

### Backend Development

Run tests:
```bash
cd backend/app_api
mix test
```

Format code:
```bash
mix format
```

Check code quality:
```bash
mix credo
```

### Frontend Development

Run linter:
```bash
cd frontend/app_web
npm run lint
```

Build for production:
```bash
npm run build
```

### Database

SQLite database schema:

```sql
CREATE TABLE listens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_name TEXT,
  listened_at INTEGER NOT NULL,
  recording_mbid TEXT,
  artist_mbid TEXT,
  release_mbid TEXT,
  additional_info TEXT,
  inserted_at DATETIME NOT NULL
);
```

Access database directly:
```bash
sqlite3 data/viking.db
```

## API Documentation

Viking Scrobbler implements the ListenBrainz API v1 specification with the following endpoints:

### Authentication
All endpoints require a valid token in the Authorization header:
```
Authorization: Token YOUR_TOKEN_HERE
```

### Supported Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/1/submit-listens` | POST | Submit single or multiple listens |
| `/1/user/:user_name/listens` | GET | Get user's listen history |
| `/1/user/:user_name/recent-listens` | GET | Get recent listens |
| `/1/stats/user/:user_name/artists` | GET | Get top artists |
| `/1/stats/user/:user_name/recordings` | GET | Get top tracks |
| `/1/stats/user/:user_name/listening-activity` | GET | Get listening activity chart data |
| `/1/stats/user/:user_name/totals` | GET | Get aggregated statistics |
| `/1/validate-token` | GET | Validate API token |

### Time Range Parameters

All statistics endpoints support `range` parameter:
- `week` - Last 7 days
- `month` - Last 30 days
- `year` - Last 365 days
- `all_time` - All historical data (default)

## Troubleshooting

### Common Issues

**Problem:** Database locked error
```
Solution: Ensure only one instance is accessing the database. Check for orphaned processes.
```

**Problem:** CORS errors in browser
```
Solution: Verify backend is running and CORS is properly configured in router.ex
```

**Problem:** Token validation fails
```
Solution: Regenerate token in dashboard. Ensure token is sent in Authorization header.
```

**Problem:** Docker container won't start
```
Solution: Check logs with: docker logs viking-scrobbler
Verify ports 3000 and 4000 are not in use by other applications.
```

**Problem:** Frontend shows "Failed to fetch"
```
Solution: Verify backend is accessible at the configured API URL.
Check network connectivity between frontend and backend containers.
```

### Debug Mode

Enable detailed logging in Phoenix:
```elixir
# config/dev.exs
config :logger, level: :debug
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Backend: Follow Elixir style guide, use `mix format`
- Frontend: Follow TypeScript/React best practices, use ESLint
- Write descriptive commit messages
- Add tests for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ListenBrainz for API specification
- Navidrome for subsonic API inspiration
- Phoenix Framework team
- React and Vite communities

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

## Roadmap

Planned features:
- Multi-user support with user registration
- MusicBrainz metadata enrichment
- Export functionality (CSV, JSON)
- Advanced analytics and insights
- Mobile-responsive improvements
- Last.fm API compatibility
