# SRE Platform - GitHub Copilot Instructions

## Project Overview

This is an **AI-Powered Incident Management Platform** inspired by incident.io and rootly.ai. It provides comprehensive incident response, postmortem generation, knowledge graph recommendations, and service runbooks management.

**Tech Stack:**
- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL 16
- **Migrations:** Liquibase
- **Real-time:** Socket.io WebSocket server
- **Storage:** MinIO (S3-compatible, optional)
- **AI:** Anthropic Claude (Sonnet 4.5) OR Google Gemini (via Vertex AI)
- **Containerization:** Docker, Docker Compose

## Architecture Principles

### Microservices Architecture
- **Frontend Container** (port 3000): Next.js application
- **Backend Container** (port 3001): Express.js REST API
- **WebSocket Container** (port 4000): Socket.io server for real-time updates
- **PostgreSQL Container** (port 5432): Database
- **Liquibase Container**: Database migrations (runs once, exits)
- **MinIO Container** (ports 9000/9001): Optional S3-compatible storage
- **pgAdmin Container** (port 5050): Database UI

### Key Design Patterns
1. **Separation of Concerns**: Frontend, backend, and WebSocket server are completely separate
2. **Database-First**: All data models defined in Liquibase changesets and Prisma schema
3. **AI Provider Abstraction**: Support both Anthropic and Google AI with automatic fallback
4. **Real-time Updates**: WebSocket broadcasting for incident timeline changes
5. **Knowledge Graph**: Vector embeddings for intelligent incident recommendations

## Code Style & Conventions

### TypeScript/JavaScript
```typescript
// Use TypeScript for frontend (Next.js)
// Use JavaScript for backend (Express) and WebSocket server

// Frontend: Use React Server Components by default
// Mark Client Components with 'use client' directive
'use client';

// Prefer functional components with hooks
const Component = () => {
  const [state, setState] = useState<Type>(initialValue);
  // ...
};

// Use explicit types for interfaces
interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'mitigated' | 'resolved' | 'closed';
  // ...
}
```

### API Routes
```javascript
// Backend routes follow REST conventions
// Routes located in: backend/routes/

// GET    /api/incidents          - List all incidents
// POST   /api/incidents          - Create incident
// GET    /api/incidents/:id      - Get incident
// PATCH  /api/incidents/:id      - Update incident
// DELETE /api/incidents/:id      - Delete incident

// Use Express Router pattern
const router = express.Router();
router.get('/', async (req, res) => { /* ... */ });
module.exports = router;
```

### Database
```sql
-- All schema changes go through Liquibase
-- Location: liquibase/changesets/
-- Follow sequential numbering: 001-xxx.xml, 002-xxx.xml

-- Use UUID for primary keys (gen_random_uuid())
-- Use snake_case for column names
-- Use camelCase in application code (Prisma transforms)
```

### Styling
```typescript
// Use Tailwind CSS utility classes
// No custom CSS files except globals.css

// DARK MODE: Always include dark mode variants for all elements
<div className="max-w-7xl mx-auto px-8 py-8">
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
    Title
  </h1>
</div>

// Dark Mode Color System:
// - Pages: bg-gray-50 dark:bg-gray-900
// - Cards: bg-white dark:bg-gray-800
// - Borders: border-gray-200 dark:border-gray-700
// - Primary Text: text-gray-900 dark:text-white
// - Secondary Text: text-gray-600 dark:text-gray-300
// - Tertiary Text: text-gray-500 dark:text-gray-400
// - Icons: text-gray-400 dark:text-gray-500
// - Input Backgrounds: bg-white dark:bg-gray-700
// - Input Borders: border-gray-300 dark:border-gray-600
// - Hover States: hover:bg-gray-100 dark:hover:bg-gray-700

// Use clsx for conditional classes
import clsx from 'clsx';
className={clsx(
  'base-classes',
  condition && 'conditional-classes'
)}
```

### Dark Mode Implementation
**Files:**
- Theme Provider: `app/components/ThemeProvider.tsx`
- Theme Toggle: `app/components/ThemeToggle.tsx`
- Root Layout: `app/layout.tsx`
- Tailwind Config: `tailwind.config.ts`

**Key Points:**
- Dark mode uses Tailwind's `class` strategy
- Theme persisted in localStorage
- Inline script prevents flash of unstyled content
- ThemeProvider wraps entire app in layout.tsx
- Moon/Sun toggle button in all navigation headers
- All pages, components, and forms have dark mode support

**Usage Pattern:**
```typescript
// ALWAYS add dark: variants when styling elements
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"

// Navigation and headers
className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"

// Form inputs
className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"

// Cards and containers
className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
```

## Key Features & Implementation

### 1. Incident Management
**Files:**
- Frontend: `app/incidents/page.tsx`, `app/incidents/[id]/page.tsx`
- Backend: `backend/routes/incidents.js`
- Database: `liquibase/changesets/001-initial-schema.xml`

**Key Points:**
- Incidents have lifecycle: active → mitigated → resolved → closed
- Severities: critical, high, medium, low
- Real-time timeline updates via WebSocket
- ServiceNow integration for syncing incidents

### 2. AI-Powered Postmortems
**Files:**
- Frontend: `app/incidents/[id]/components/PostmortemTab.tsx`
- Backend: `backend/routes/postmortem.js`, `backend/services/aiService.js`
- Database: `liquibase/changesets/002-postmortem-schema.xml`, `003-postmortem-swiss-cheese-schema.xml`

**Key Points:**
- One-click postmortem generation from incident data
- Supports methodologies: 5 Whys, Swiss Cheese Model (4-layer defense analysis)
- AI auto-fills timeline, root cause, action items
- Real-time AI chatbot assistance during writing
- Publishing triggers vector embedding generation

### 3. Knowledge Graph & Recommendations
**Files:**
- Frontend: `app/incidents/[id]/components/KnowledgeGraphRecommendations.tsx`
- Backend: `backend/services/knowledgeGraphService.js`, `backend/routes/knowledgeGraph.js`
- Database: `liquibase/changesets/004-knowledge-graph-schema.xml`

**Key Points:**
- Uses Vertex AI text-embedding-004 model for vector embeddings
- Cosine similarity search for finding related incidents
- AI-generated contextualized recommendations using Gemini 2.0 Flash
- 15-minute caching for performance
- Only published postmortems are indexed

**Implementation:**
```javascript
// Embedding generation on postmortem publish
await knowledgeGraphService.processPublishedPostmortem(postmortemId);

// Get recommendations for current incident
const recommendations = await knowledgeGraphService.getIncidentRecommendations(incidentId);
```

### 4. Service Runbooks
**Files:**
- Frontend: `app/runbooks/page.tsx`, `app/runbooks/[id]/page.tsx`
- Backend: `backend/routes/runbooks.js`
- Database: `liquibase/changesets/001-initial-schema.xml` (runbooks table)

**Key Points:**
- Service documentation with team contacts
- Monitoring links, upstream/downstream dependencies
- Troubleshooting procedures
- Link runbooks to incidents

### 5. Real-time Updates (WebSocket)
**Files:**
- WebSocket Server: `websocket/server.js`
- Frontend Integration: `app/incidents/[id]/components/InvestigationTab.tsx`

**Key Points:**
```javascript
// Client joins incident room
socket.emit('join-incident', incidentId);

// Broadcast timeline update
socket.emit('timeline-event', { incidentId, event });

// Listen for updates
socket.on('timeline-update', (event) => { /* ... */ });
```

### 6. ServiceNow Integration
**Files:**
- Backend: `backend/services/serviceNowService.js`, `backend/routes/servicenow.js`
- Database: `liquibase/changesets/006-servicenow-integration.xml`

**Key Points:**
- Bi-directional sync with ServiceNow incidents
- Maps internal severities/statuses to ServiceNow values
- Stores sync metadata (sys_id, last_sync_at)
- Gracefully disabled if credentials not configured

## AI Service Implementation

### Provider Selection Priority
1. **Anthropic Claude** (if `ANTHROPIC_API_KEY` is set)
2. **Google Gemini** (if `google-service-account-key.json` exists or `GOOGLE_SERVICE_ACCOUNT_KEY` env var)
3. **Error** if neither is configured

### Usage Pattern
```javascript
const aiService = require('./services/aiService');

// Generate completion
const response = await aiService.generateCompletion({
  systemPrompt: 'You are a helpful assistant...',
  userMessage: 'Generate a postmortem...',
  temperature: 0.3,
  jsonMode: true, // For structured output
});
```

### Models Used
- **Anthropic:** claude-sonnet-4-5
- **Google (Chat):** gemini-2.0-flash-exp
- **Google (Embeddings):** text-embedding-004

## Development Workflow

### First-Time Setup
```bash
npm run first-run
# Prompts for API keys, creates .env, starts containers, seeds DB
```

### Making Changes

**Backend Changes:**
```bash
# Edit backend/routes/*.js or backend/services/*.js
docker compose restart backend
```

**Frontend Changes:**
```bash
# Edit app/**/*.tsx
docker compose restart frontend
# Or use hot-reload (already enabled in dev mode)
```

**Database Schema Changes:**
```bash
# 1. Create new changeset: liquibase/changesets/00X-description.xml
# 2. Add to liquibase/db.changelog-master.xml
# 3. Update prisma/schema.prisma (keep in sync!)
# 4. Restart liquibase
docker compose up liquibase
```

**WebSocket Changes:**
```bash
# Edit websocket/server.js
docker compose restart websocket
```

### Common Commands
```bash
npm run docker:up        # Start all containers
npm run docker:seed      # Seed database
npm run docker:logs      # View all logs
docker compose restart <service>  # Restart specific service
docker compose up -d --build      # Rebuild all containers
```

## Environment Variables

### Required
```bash
# AI Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-xxx

# OR Google Cloud
# Place google-service-account-key.json in project root

# Database (auto-configured in docker-compose.yml)
DATABASE_URL=postgresql://sre_user:sre_password@postgres:5432/sre_platform
```

### Optional
```bash
# ServiceNow Integration
SERVICENOW_INSTANCE_URL=https://dev12345.service-now.com
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=password

# Environment
NODE_ENV=development
PORT=3001
```

## Database Schema Overview

### Core Tables
- **users**: User accounts
- **incidents**: Incident records with severity, status, timestamps
- **timeline_events**: Incident timeline updates (real-time)
- **runbooks**: Service documentation and procedures
- **incident_services**: Links incidents to affected services (many-to-many)

### Postmortem Tables
- **postmortems**: Main postmortem data (status, methodology, content)
- **action_items**: Follow-up tasks from postmortems
- **postmortem_five_whys**: 5 Whys analysis entries
- **postmortem_swiss_cheese**: Swiss Cheese Model analysis (4 layers)

### Knowledge Graph Tables
- **postmortem_embeddings**: Vector embeddings for similarity search
- **incident_recommendations**: Cached AI recommendations (15-min TTL)

### ServiceNow Tables
- **servicenow_incident_mappings**: Sync metadata for bidirectional integration

## Best Practices

### When Adding New Features

1. **Database-First**: Define schema in Liquibase, update Prisma
2. **API-Driven**: Backend exposes REST endpoints, frontend consumes
3. **Type Safety**: Use TypeScript interfaces for data structures
4. **Error Handling**: Always handle errors gracefully in both frontend and backend
5. **Loading States**: Show loading indicators for async operations
6. **Real-time**: Use WebSocket for live updates when applicable
7. **Dark Mode**: Always include dark: variants for ALL new UI elements

### When Working with AI

1. **Check Provider**: AI service automatically selects provider
2. **Timeout Handling**: AI operations have 5-minute timeout
3. **Error Messages**: Provide helpful error messages to users
4. **Streaming**: Consider streaming for long responses (chatbot)
5. **Context Management**: Include relevant incident data in prompts

### When Modifying UI

1. **Responsive Design**: Use Tailwind's responsive utilities
2. **Consistent Spacing**: Follow existing padding/margin patterns (px-8, py-8)
3. **Dark Mode First**: ALWAYS add dark mode variants (dark:bg-gray-800, dark:text-white)
4. **Color Palette**: Use gray-900 (text), gray-600 (secondary), blue-600 (primary)
5. **Icons**: Use lucide-react icon library
6. **Accessibility**: Include aria-labels, proper semantic HTML
7. **Theme Toggle**: Include ThemeToggle component in navigation headers

### When Writing Backend Code

1. **Database Connections**: Use the shared `db.js` pool
2. **Error Responses**: Return proper HTTP status codes and error messages
3. **Logging**: Use `console.log` with timestamps for debugging
4. **Validation**: Validate inputs before database operations
5. **Transactions**: Use database transactions for multi-step operations

## File Organization

```
sre-platform/
├── app/                          # Next.js App Router
│   ├── incidents/               # Incident pages
│   │   ├── [id]/               # Dynamic incident detail page
│   │   │   ├── components/     # Incident-specific components
│   │   │   │   ├── OverviewTab.tsx        # AI summary & action items
│   │   │   │   ├── InvestigationTab.tsx   # Timeline & knowledge graph
│   │   │   │   └── PostmortemTab.tsx      # Postmortem editor
│   │   │   └── page.tsx
│   │   ├── new/                # New incident form
│   │   └── page.tsx            # Incident list
│   ├── runbooks/               # Runbook pages
│   ├── components/             # Shared components
│   │   ├── ThemeProvider.tsx   # Dark mode context
│   │   ├── ThemeToggle.tsx     # Theme switcher button
│   │   ├── StatusBadge.tsx     # Status indicators
│   │   └── ConfirmationModal.tsx  # Reusable modal
│   ├── layout.tsx              # Root layout with ThemeProvider
│   ├── globals.css             # Dark mode CSS variables
│   └── page.tsx                # Homepage
├── backend/                     # Express.js API
│   ├── routes/                 # API route handlers
│   ├── services/               # Business logic
│   │   ├── aiService.js        # AI provider abstraction
│   │   ├── knowledgeGraphService.js  # Vector search & recommendations
│   │   └── serviceNowService.js      # ServiceNow integration
│   ├── db.js                   # PostgreSQL connection pool
│   └── server.js               # Express server setup
├── websocket/                   # Socket.io server
│   └── server.js
├── liquibase/                   # Database migrations
│   ├── changesets/             # Individual migrations
│   └── db.changelog-master.xml # Master changelog
├── prisma/                      # Prisma ORM (reference only)
│   └── schema.prisma           # Schema definition
├── scripts/                     # Setup and utility scripts
├── docs/                        # Documentation
├── docker-compose.yml          # Docker orchestration
└── package.json                # Frontend dependencies
```

## Testing & Debugging

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f websocket
```

### Database Access
```bash
# pgAdmin UI
http://localhost:5050
# Login: admin@admin.com / admin

# Direct psql connection
docker compose exec postgres psql -U sre_user -d sre_platform
```

### Test AI Integration
```bash
# Test AI service connectivity
docker compose exec backend node test-ai-service.js
```

### Common Issues

**"AI service not configured":**
- Ensure ANTHROPIC_API_KEY is set OR google-service-account-key.json exists
- Check environment variables in docker-compose.yml

**Database connection errors:**
- Verify PostgreSQL is running: `docker compose ps`
- Check healthcheck: `docker compose exec postgres pg_isready`

**Frontend can't connect to backend:**
- Ensure backend is running on port 3001
- Check NEXT_PUBLIC_API_URL in docker-compose.yml

**WebSocket not connecting:**
- Verify WebSocket server is running on port 4000
- Check CORS configuration in websocket/server.js

**Dark mode not applying:**
- Verify ThemeProvider wraps app in layout.tsx
- Check suppressHydrationWarning on html/body tags
- Ensure all new components have dark: variants
- Clear browser cache and localStorage

## Security Considerations

1. **Credentials**: Never commit `.env` or `google-service-account-key.json`
2. **API Keys**: Store in environment variables, not in code
3. **Database**: Use connection pooling, prepared statements (via pg library)
4. **CORS**: Properly configure CORS in both backend and WebSocket server
5. **Validation**: Validate all user inputs before processing

## Contributing Guidelines

1. **Follow existing patterns**: Look at similar files before creating new ones
2. **Keep it simple**: Don't over-engineer solutions
3. **Document changes**: Update this file if adding major features
4. **Test thoroughly**: Test in Docker environment, not just local
5. **Consistent naming**: Use camelCase for JS/TS, snake_case for SQL
6. **Dark Mode Required**: All new UI components MUST include dark mode variants

## Quick Reference Links

- **Setup Guide:** [docs/SETUP.md](../docs/SETUP.md)
- **Quick Start:** [QUICK_START.md](../QUICK_START.md)
- **Knowledge Graph:** [docs/KNOWLEDGE_GRAPH_IMPLEMENTATION.md](../docs/KNOWLEDGE_GRAPH_IMPLEMENTATION.md)
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Socket.io:** https://socket.io/docs/v4/
- **Anthropic API:** https://docs.anthropic.com/
- **Vertex AI:** https://cloud.google.com/vertex-ai/docs

---

**Last Updated:** February 9, 2026
**Project Version:** 0.1.0
**Maintainer:** Hackathon Team (bvb-org/sre-platform)
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Socket.io:** https://socket.io/docs/v4/
- **Anthropic API:** https://docs.anthropic.com/
- **Vertex AI:** https://cloud.google.com/vertex-ai/docs

---

**Last Updated:** February 9, 2026
**Project Version:** 0.1.0
**Maintainer:** Hackathon Team (bvb-org/sre-platform)
