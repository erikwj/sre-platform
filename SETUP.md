# 🚀 Quick Setup Guide

This guide will help you get the SRE Platform up and running on your machine (Windows or macOS).

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/downloads)

## 🎯 First Time Setup

If this is your first time running the project, follow these steps:

### 1. Clone the repository

```bash
git clone <repository-url>
cd sre-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the first-run script

This single command will:
- Create your `.env` file from `.env.example`
- Start all Docker containers (database, backend, frontend, websocket)
- Wait for services to initialize
- Seed the database with sample data

```bash
npm run first-run
```

**⏳ Note:** The first run may take 5-10 minutes as Docker needs to download and build all images.

### 4. Access the application

Once complete, open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **MinIO Console:** http://localhost:9001

## 📋 Available Commands

After the initial setup, you can use these commands:

### Setup & Configuration

```bash
npm run setup
```
Creates a `.env` file from `.env.example` (only needed if you delete your `.env` file)

### Docker Management

```bash
npm run deploy
# or
npm run docker:up
```
Start all Docker containers in detached mode

```bash
npm run docker:down
```
Stop all Docker containers

```bash
npm run docker:logs
```
View logs from all containers (useful for debugging)

### Database Seeding

```bash
npm run docker:seed
```
Seed the database with sample data (incidents, runbooks, users, etc.)

### Development

```bash
npm run dev
```
Run Next.js in development mode (only if you want to run frontend locally without Docker)

## 🔧 Configuration

### Environment Variables

After running `npm run setup`, edit the `.env` file to configure:

- **ANTHROPIC_API_KEY**: Your Anthropic API key for AI features (required for postmortem generation)
- **NEXT_PUBLIC_API_URL**: Backend API URL (default: http://localhost:3001)
- **WEBSOCKET_URL**: WebSocket server URL (default: http://localhost:4000)

### Database Connection

The database credentials are configured in `docker-compose.yml`:
- **Host:** localhost
- **Port:** 5432
- **Database:** sre_platform
- **User:** sre_user
- **Password:** sre_password

## 🐛 Troubleshooting

### Port Already in Use

If you see errors about ports already being in use:

```bash
npm run docker:down
```

Then try starting again:

```bash
npm run docker:up
```

### Docker Containers Not Starting

Check Docker Desktop is running, then view the logs:

```bash
npm run docker:logs
```

### Database Connection Issues

Make sure the PostgreSQL container is healthy:

```bash
docker ps
```

Look for `sre-platform-db` with status "healthy"

### Seed Command Fails

Wait a bit longer for services to fully start, then try again:

```bash
npm run docker:seed
```

## 🔄 Daily Workflow

For day-to-day development:

1. **Start your day:**
   ```bash
   npm run docker:up
   ```

2. **Work on your code** - Changes will hot-reload automatically

3. **View logs if needed:**
   ```bash
   npm run docker:logs
   ```

4. **End your day:**
   ```bash
   npm run docker:down
   ```

## 🆘 Need Help?

If you encounter any issues not covered here, please:
1. Check the logs: `npm run docker:logs`
2. Ensure Docker Desktop is running
3. Verify all prerequisites are installed
4. Contact the team for assistance

---

**Happy coding! 🎉**
