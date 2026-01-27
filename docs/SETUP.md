# 🚀 Quick Setup Guide

This guide will help you get the SRE Platform up and running on your machine (Windows or macOS).

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/downloads)
- **Anthropic API Key** - [Get one here](https://console.anthropic.com/)

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
- Prompt you for your Anthropic API key
- Create your `.env` file with the API key configured
- Start all Docker containers (database, backend, frontend, websocket)
- Wait for services to initialize
- Seed the database with sample data
- Display access URLs

```bash
npm run first-run
```

**During setup, you'll be asked:**
- Whether to overwrite `.env` if it exists
- Your Anthropic API key (you can skip and add it later)

**⏳ Note:** The first run may take 5-10 minutes as Docker needs to download and build all images.

### 4. Access the application

Once complete, you'll see a success message with these URLs:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **MinIO Console:** http://localhost:9001

## 📋 Available Commands

After the initial setup, you can use these commands:

### Setup & Configuration

```bash
npm run setup
```
Interactive setup that prompts for your Anthropic API key and creates the `.env` file

### Docker Management

```bash
npm run deploy
# or
npm run docker:up
```
Start all Docker containers in detached mode

```bash
docker compose up -d --build
```
Rebuild and restart all containers (use after making changes to code)

```bash
docker compose restart backend
```
Restart only the backend container (after backend code changes)

```bash
docker compose restart frontend
```
Restart only the frontend container (after frontend code changes)

```bash
docker compose restart liquibase
```
Re-run database migrations (after schema changes)

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

The setup script will create a `.env` file and optionally configure your Anthropic API key.

If you skipped entering the API key during setup, you can add it manually:

1. Open the `.env` file in your project root
2. Find the line: `ANTHROPIC_API_KEY=your_anthropic_api_key_here`
3. Replace `your_anthropic_api_key_here` with your actual API key
4. Restart the backend container: `npm run docker:down && npm run docker:up`

Other environment variables you can configure:
- **NEXT_PUBLIC_API_URL**: Backend API URL (default: http://localhost:3001)
- **WEBSOCKET_URL**: WebSocket server URL (default: http://localhost:4000)
- **MINIO_***: MinIO storage configuration

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

1. Open Docker Desktop
2. Stop the running containers
3. Start again: `npm run docker:up`

### Docker Containers Not Starting

1. Check Docker Desktop is running
2. Open Docker Desktop and view the container logs to see what's wrong

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

### API Key Not Working

If you added your API key after the containers started:

1. Make sure it's correctly set in `.env`
2. Restart the backend container:
   ```bash
   docker compose restart backend
   ```

## 🔄 Daily Workflow

For day-to-day development:

1. **Start your day:**
   ```bash
   npm run docker:up
   ```

2. **Work on your code** - Changes will hot-reload automatically

3. **After making changes:**
   - Frontend/Backend changes: `docker compose restart frontend` or `docker compose restart backend`
   - Database schema changes: `docker compose restart liquibase`
   - Major changes: `docker compose up -d --build`

4. **View logs if needed:** Open Docker Desktop and click on the container

5. **End your day:** Stop containers via Docker Desktop

## 🆘 Need Help?

If you encounter any issues not covered here, please:
1. Check the logs in Docker Desktop
2. Ensure Docker Desktop is running
3. Verify all prerequisites are installed
4. Make sure your Anthropic API key is valid
5. Contact the team for assistance

---

**Happy coding! 🎉**
