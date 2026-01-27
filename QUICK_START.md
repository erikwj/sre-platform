# ⚡ Quick Start Reference

## First Time Setup

```bash
npm install
npm run first-run
```

You'll be prompted for your Anthropic API key during setup.

## Access URLs

- 🌐 Frontend: http://localhost:3000
- 🔧 Backend: http://localhost:3001
- 📦 MinIO: http://localhost:9001

## Common Commands

### Starting/Stopping

```bash
npm run docker:up          # Start all containers
```

Stop containers via **Docker Desktop**

### After Code Changes

```bash
docker compose restart backend    # Backend changes
docker compose restart frontend   # Frontend changes
docker compose up -d --build      # Major changes (rebuild all)
```

### Database

```bash
npm run docker:seed               # Seed with sample data
docker compose restart liquibase  # Re-run migrations
```

### Debugging

- **View Logs:** Open Docker Desktop → Click on container
- **Check Status:** Docker Desktop → Containers tab

## Need Help?

See [SETUP.md](docs/SETUP.md) for detailed instructions.
