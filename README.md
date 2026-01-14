# SRE Platform - AI-Powered Incident Management

An incident.io and rootly.ai-inspired platform for incident management, AI-powered postmortems, and service runbooks.

## Features

- 🚨 **Incident Management** - Declare, track, and resolve incidents with real-time collaboration
- 🤖 **AI-Powered Postmortems** - Automatically generate comprehensive postmortems from incident data
- 📚 **Service Runbooks** - Centralized repository of service documentation and troubleshooting procedures
- ⚡ **Real-time Updates** - WebSocket-powered live updates for incident timelines
- 🐳 **Fully Containerized** - All components run in Docker containers

## Architecture

- **Frontend:** Next.js 14+ with TypeScript and Tailwind CSS
- **Database:** PostgreSQL (Alpine-based)
- **Migrations:** Liquibase for version-controlled schema management
- **Real-time:** Socket.io WebSocket server
- **Storage:** MinIO (S3-compatible, optional)
- **AI:** OpenAI GPT-4 for postmortem generation and analysis

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sre-platform
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database (port 5432)
   - Liquibase migrations (runs once)
   - Next.js frontend (port 3000)
   - WebSocket server (port 4000)
   - MinIO storage (ports 9000, 9001)

4. **Access the application**
   - Frontend: http://localhost:3000
   - MinIO Console: http://localhost:9001

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   npm install
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

4. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: WebSocket server
   cd websocket && npm start
   ```

## Project Structure

```
sre-platform/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Homepage
│   ├── incidents/         # Incident pages
│   ├── runbooks/          # Runbook pages
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
├── prisma/               # Prisma schema
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
- `OPENAI_API_KEY` - OpenAI API key for AI features

Optional:
- `WEBSOCKET_URL` - WebSocket server URL
- `MINIO_*` - MinIO configuration

## Contributing

This is a hackathon project. Contributions welcome!

## License

MIT
