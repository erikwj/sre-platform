# SRE Platform - AI-Powered Incident Management

An incident.io and rootly.ai-inspired platform for incident management, AI-powered postmortems, and service runbooks.

## Features

- 🚨 **Incident Management** - Declare, track, and resolve incidents with real-time collaboration
- 🤖 **AI-Powered Postmortems** - Automatically generate comprehensive postmortems from incident data
- 📚 **Service Runbooks** - Centralized repository of service documentation and troubleshooting procedures
- ⚡ **Real-time Updates** - WebSocket-powered live updates for incident timelines
- 🐳 **Fully Containerized** - All components run in Docker containers

## Architecture

The platform uses a **microservices architecture** with separate frontend and backend containers:

- **Frontend:** Next.js 14+ with TypeScript and Tailwind CSS (port 3000)
- **Backend API:** Express.js REST API (port 3001)
- **Database:** PostgreSQL (Alpine-based, port 5432)
- **Migrations:** Liquibase for version-controlled schema management
- **Real-time:** Socket.io WebSocket server (port 4000)
- **Storage:** MinIO (S3-compatible, optional, ports 9000/9001)
- **AI:** Anthropic Claude or Google Gemini for postmortem generation and analysis

## Quick Start

**🚀 New to the project? Check out [SETUP.md](SETUP.md) for a complete step-by-step guide!**

### One-Command Setup (Recommended)

For first-time setup, run these commands:

```bash
npm install
npm run first-run
```

The setup will:
- **Prompt you** for your Anthropic API key (interactive)
- Create your `.env` file with the API key configured
- Start all Docker containers
- Wait for services to initialize
- Seed the database with sample data
- Display success message with access URLs

Then access the application at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **MinIO Console:** http://localhost:9001

### Available Commands

```bash
npm run setup                    # Interactive setup (prompts for API key)
npm run first-run                # Complete first-time setup
npm run deploy                   # Start all Docker containers
npm run docker:up                # Start all Docker containers
npm run docker:seed              # Seed database with sample data
docker compose up -d --build     # Rebuild containers after code changes
docker compose restart backend   # Restart backend after changes
docker compose restart frontend  # Restart frontend after changes
```

**Note:** Use Docker Desktop to view logs and stop containers.

### Prerequisites

- **Node.js** 18+ - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **AI Provider** (choose one):
  - **Anthropic API Key** (recommended for development) - [Get API Key](https://console.anthropic.com/)
  - **Google Cloud Service Account** (for sandbox environments) - See [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd backend && npm install && cd ..
   
   # WebSocket dependencies
   cd websocket && npm install && cd ..
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```

3. **Run Liquibase migrations**
   ```bash
   docker-compose up liquibase
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend API
   cd backend && npm run dev

   # Terminal 2: Frontend
   npm run dev

   # Terminal 3: WebSocket server
   cd websocket && npm start
   ```

## Project Structure

```
sre-platform/
├── app/                    # Next.js app directory (Frontend UI)
│   ├── page.tsx           # Homepage
│   ├── incidents/         # Incident pages
│   ├── runbooks/          # Runbook pages
│   ├── components/        # React components
│   └── globals.css        # Global styles
├── backend/               # Express.js backend API
│   ├── routes/            # API route handlers
│   │   ├── incidents.js   # Incident endpoints
│   │   ├── runbooks.js    # Runbook endpoints
│   │   ├── users.js       # User endpoints
│   │   └── postmortem.js  # Postmortem endpoints
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   ├── Dockerfile         # Backend container
│   └── README.md          # Backend documentation
├── lib/                   # Shared utility functions
├── liquibase/            # Database migrations
│   ├── db.changelog-master.xml
│   └── changesets/
├── websocket/            # WebSocket server
│   ├── server.js
│   └── package.json
├── docker-compose.yml    # Docker orchestration
├── Dockerfile            # Frontend container
└── Dockerfile.websocket  # WebSocket container
```

## Database Schema

The platform uses PostgreSQL with the following main tables:

- `users` - User accounts
- `incidents` - Incident records
- `timeline_events` - Incident activity timeline
- `runbooks` - Service documentation
- `postmortems` - AI-generated postmortems
- `action_items` - Incident action items

Migrations are managed by Liquibase for version control and consistency.

## Development Workflow

### Stage 0: Foundation ✅
- [x] Next.js project setup
- [x] Tailwind CSS configuration
- [x] Docker Compose setup
- [x] Database schema with Liquibase
- [x] WebSocket server
- [x] Homepage with navigation

### Stage 1: Incident Management (In Progress)
- [ ] Incident creation flow
- [ ] Incident detail page
- [ ] Activity timeline
- [ ] Service referencing

### Stage 2: AI Postmortems
- [ ] Postmortem generation
- [ ] Rich text editor
- [ ] AI proofreading

### Stage 3: Service Runbooks
- [ ] Runbook repository
- [ ] Service documentation

### Stage 4: AI Features
- [ ] Pattern recognition
- [ ] Insights dashboard

## Environment Variables

See `.env.example` for all available configuration options.

Required:
- `DATABASE_URL` - PostgreSQL connection string
- **AI Provider** (choose one):
  - `ANTHROPIC_API_KEY` - Anthropic Claude API key for AI features
  - `GOOGLE_SERVICE_ACCOUNT_KEY` - Google Cloud service account JSON for Gemini API (see [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md))

Optional:
- `WEBSOCKET_URL` - WebSocket server URL
- `MINIO_*` - MinIO configuration

## AI Provider Configuration

The platform supports two AI providers:

1. **Anthropic Claude** (default) - Best for development
   - Set `ANTHROPIC_API_KEY` in your `.env` file
   - Get your API key from [Anthropic Console](https://console.anthropic.com/)

2. **Google Gemini** - Best for sandbox environments with service accounts
   - Set `GOOGLE_SERVICE_ACCOUNT_KEY` in your `.env` file
   - See [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md) for detailed setup instructions

The system automatically selects the provider based on which credentials are available. If both are set, Anthropic takes priority.

## Contributing

This is a hackathon project. Contributions welcome!

## License

MIT
