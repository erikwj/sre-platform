# AI-Powered SRE Platform - Implementation Plan

## Project Overview

Building an incident.io and rootly.ai-inspired platform for incident management, AI-powered postmortems, and service runbooks. Focus on clean, minimalist UI with clear metrics and structured data flow.

### Architecture Principles

**Containerized Deployment:**
- All components run in Docker containers
- Local development using Docker Compose
- Production-ready container orchestration
- No external managed services (Supabase, Firebase, etc.)

**Infrastructure Stack:**
- **Database:** PostgreSQL (lightweight Alpine-based image ~80MB)
- **Database Migrations:** Liquibase for version-controlled schema management
- **Backend:** Next.js API routes or separate Node.js/Express API
- **Frontend:** Next.js 14+ with TypeScript
- **Real-time:** WebSocket server (Socket.io or native WebSockets)
- **Storage:** Local filesystem or MinIO (S3-compatible object storage)
- **Reverse Proxy:** Nginx (optional, for production)

**Container Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Frontend   │  │   Backend    │  │ PostgreSQL│ │
│  │   Next.js    │  │   API + WS   │  │  Alpine   │ │
│  │   Port 3000  │  │   Port 4000  │  │ Port 5432 │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   Liquibase  │  │    MinIO     │                │
│  │  Migrations  │  │  (Optional)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## Stage 0: Foundation & Homepage

### Goals
- Set up project structure and core dependencies
- Create clean, minimalist homepage with navigation
- Establish design system matching incident.io aesthetic

### Tasks
- [x] Initialize Next.js 14+ project with TypeScript
- [x] Set up Tailwind CSS with custom design tokens (neutral grays, subtle accents)
- [x] Install core dependencies:
  - PostgreSQL client (pg or Prisma)
  - Socket.io (real-time WebSocket)
  - Headless UI (accessible components)
  - Lucide React (icons)
  - OpenAI SDK (AI features)
- [x] Create Docker Compose configuration:
  - PostgreSQL service (Alpine image)
  - Next.js frontend service
  - Backend API service (if separate)
  - Liquibase service for migrations
  - MinIO service (optional, for image storage)
- [x] Set up Liquibase:
  - Initialize changelog directory structure
  - Create initial schema changesets
  - Configure Liquibase properties
- [x] Create initial database schema with Liquibase
- [x] Set up WebSocket server for real-time updates
- [x] Design homepage layout with two primary CTAs:
  - **"Declare Major Incident"** button (prominent)
  - **"View Runbooks"** link/button
- [x] Add navigation to Incidents list and Runbooks
- [x] Set up basic routing structure

### Deliverables
- Docker Compose setup with all services
- Clean homepage with incident.io and rootly.ai-inspired design
- Navigation to main sections
- Database schema ready with Liquibase migrations
- Design system established (typography, spacing, colors)
- WebSocket server configured

---

## Stage 1: Incident Creation & Management

### Goals
- Enable Manager on Duty to declare major incidents
- Create incident detail view with Overview tab
- Display key metrics and status information
- Implement timeline/activity feed

### 1.1 Incident Declaration Flow

**Tasks:**
- [ ] Create "Declare Major Incident" modal/page with form:
  - Incident number (INC-XXXXXX from ServiceNow)
  - Title (required)
  - Short description (required)
  - Severity (dropdown: Minor, Major, Critical)
  - Incident lead (auto-populate with current user/Manager on Duty)
- [ ] Form validation and submission
- [ ] Redirect to incident detail page after creation
- [ ] Auto-set initial status to "Active"
- [ ] Record creation timestamp

### 1.2 Incident Detail Page - Overview Tab

**Layout (matching incident.io screenshot):**

**Left side (main content):**
- [ ] Incident header:
  - Incident number (INC-XXXX) with breadcrumb
  - Title (large, bold)
  - Tab navigation: Overview | Investigation | Post-mortem
- [ ] Problem statement section (editable)
- [ ] Impact section (editable, default: "Unknown")
- [ ] Causes section (editable)
- [ ] Steps to resolve section (editable)
- [ ] Actions checklist:
  - Add action items with checkboxes
  - Assign to users (avatar display)
  - Mark complete/incomplete
- [ ] Quick actions: "Start a call" | "Create a stream" buttons

**Right sidebar (metadata):**
- [ ] Status badge (Active, Investigating, Mitigated, Resolved, Closed)
- [ ] Severity indicator with icon
- [ ] Type (Production, Staging, etc.)
- [ ] Duration (auto-calculated, live updating)
- [ ] **Roles section:**
  - Incident lead (with avatar)
  - Reporter
  - Active participants (avatar list)
  - Observers
- [ ] **Links section:**
  - Related incidents
  - Status pages
  - ServiceNow incident link
  - Azure DevOps work item link (optional)
  - Escalations
- [ ] **Custom fields:**
  - Affected teams (tags with colors)
  - Features/Services affected (tags)
  - Impacted device operations
  - Affected customers
  - Escalate to engineering? (Yes/No)
  - Number of affected customers
  - Customer lead owners
- [ ] Timestamps and duration metrics section

### 1.3 Investigation Tab - Activity Timeline

**Tasks:**
- [ ] Create timeline/activity feed UI:
  - Chronological list with timestamps
  - Date separators (e.g., "Wednesday 16th April")
  - Event types with icons:
    - 🔴 Incident accepted
    - 🟡 Incident reported
    - 🔵 Update shared
    - 🔄 Status changed
    - ⏸️ No update scheduled
- [ ] Timeline entry components:
  - Timestamp (HH:MM)
  - Event icon
  - Event description
  - User avatar
  - Rich content (links, tags, code snippets)
  - "via @incident" attribution
- [ ] Add timeline update form:
  - Text input with placeholder
  - Support for `/` command to reference services
  - Auto-save drafts
- [ ] Real-time updates (WebSocket with Socket.io)
- [ ] "Share update" button
- [ ] Status change tracking (Triage → Investigating → Mitigated → Resolved)
- [ ] Highlights filter and Subscribe button

### 1.4 Service/API Referencing System

**Tasks:**
- [ ] Create mock data: 10 APIs across 4-5 teams
- [ ] Implement `/` command menu:
  - Trigger on typing `/`
  - Show options: Services, People, Teams
  - For hackathon: focus on "Services" option
- [ ] Service selector dropdown:
  - Searchable list of APIs
  - Display API name and team
- [ ] Insert as hyperlink in text
- [ ] Hover preview tooltip:
  - API name
  - Team owner
  - 3-5 line description
  - "Click to view runbook" hint
- [ ] Click navigation to runbook detail page

### 1.5 Status Management

**Tasks:**
- [ ] Status dropdown in sidebar:
  - Active (red)
  - Investigating (yellow)
  - Mitigated (blue)
  - Resolved (green)
  - Closed (gray)
- [ ] Auto-log status changes to timeline
- [ ] Update duration calculations
- [ ] Visual status indicators

### Deliverables
- Fully functional incident creation flow
- Incident detail page with Overview and Investigation tabs
- Real-time activity timeline
- Service referencing with `/` command
- Clean UI matching incident.io design
- Status and metadata management

---

## Stage 2: AI-Powered Postmortem Generation

### Goals
- Auto-generate postmortems from incident data using AI
- Provide structured postmortem editor
- Implement AI proofreading and coaching
- Enable postmortem submission workflow

### 2.1 Postmortem Initiation

**Tasks:**
- [ ] Add "Post-mortem" tab to incident detail page
- [ ] Show "Generate Postmortem" button when incident status is "Resolved" or "Closed"
- [ ] Restrict access: only incident lead or affected team members can initiate
- [ ] Confirmation modal before generation

### 2.2 AI Postmortem Generation

**AI Prompt Engineering:**
- [ ] Design GPT-4 prompt to extract from incident data:
  - Timeline events
  - Status changes
  - Actions taken
  - Affected services
  - Participants
- [ ] Auto-generate sections:
  - **Introduction** (context and overview)
  - **Timeline** (start, detection, mitigation, resolution times)
  - **Root Cause** (analysis based on investigation notes)
  - **Impact** (affected services, customers, duration)
  - **How We Fixed It** (actions taken from timeline)
  - **Action Items** (preventive measures)
  - **Lessons Learned**

**Tasks:**
- [ ] Create OpenAI API integration
- [ ] Build prompt template with incident data
- [ ] Parse AI response into structured sections
- [ ] Handle API errors gracefully
- [ ] Show loading state during generation
- [ ] Display generated postmortem in editor

### 2.3 Postmortem Editor

**Layout (similar to incident.io screenshot):**
- [ ] Document-style editor with sections:
  - Introduction (editable text area)
  - Timeline (structured data + text)
  - Root Cause (text area)
  - Impact (metrics + text)
  - How We Fixed It (text area)
  - Action Items (checklist)
  - Lessons Learned (text area)
- [ ] Rich text formatting:
  - Bold, italic, code blocks
  - Bullet lists, numbered lists
  - Headings (H2, H3)
  - Links
- [ ] Image upload capability:
  - Drag & drop or file picker
  - Store in MinIO or local filesystem
  - Display inline in postmortem
  - Image captions
- [ ] Service referencing with `/` command (same as incidents)
- [ ] Auto-save drafts every 30 seconds
- [ ] "Last edited" timestamp with user avatar
- [ ] Edit history tracking

### 2.4 AI Coaching & Proofreading

**AI Assistant Panel (sidebar or modal):**
- [ ] "Ask AI" chat interface:
  - Input: "How do I use the Swiss Cheese Model for this?"
  - AI provides methodology guidance
  - Context-aware responses based on current postmortem
- [ ] "Check Postmortem" button:
  - AI analyzes completeness
  - Checks for:
    - Sections with only 1-2 sentences (flag as insufficient)
    - Missing critical information
    - Timeline gaps
    - Unclear root cause
    - Missing action items
  - Provides specific feedback:
    - ✅ "Root cause is well-documented"
    - ⚠️ "Impact section needs more detail (only 1 sentence)"
    - ❌ "No action items defined"
- [ ] Inline suggestions:
  - Highlight weak sections
  - Suggest improvements
  - Offer to expand sections with AI

**Tasks:**
- [ ] Create AI proofreading prompt
- [ ] Build feedback UI component
- [ ] Implement chat interface for AI questions
- [ ] Add "Expand this section" AI feature
- [ ] Quality score indicator (optional)

### 2.5 Image Handling Strategy

**Approach:**
- [ ] Upload images to MinIO (S3-compatible) or local filesystem
- [ ] Store metadata in database (filename, size, caption, section)
- [ ] Display images inline in postmortem
- [ ] For AI analysis (optional/future):
  - Use GPT-4 Vision to extract text/diagrams from images
  - Warn users if images contain critical info not in text
  - Suggest adding image descriptions

**Tasks:**
- [ ] Implement image upload component
- [ ] MinIO bucket setup or filesystem directory structure
- [ ] Image preview and management
- [ ] Caption editing
- [ ] Image deletion

### 2.6 Postmortem Submission

**Tasks:**
- [ ] "Save Draft" button (auto-save already active)
- [ ] "Submit Postmortem" button:
  - Run AI check first
  - Show warnings if quality issues detected
  - Confirm submission
  - Mark postmortem as "Published"
  - Lock editing (or version control)
- [ ] Postmortem status: Draft, Under Review, Published
- [ ] Notification to affected teams
- [ ] Export to PDF/Word (optional for hackathon)

### Deliverables
- AI-generated postmortem from incident data
- Rich text editor with image support
- AI coaching and proofreading features
- Service referencing in postmortems
- Submission workflow with quality checks

---

## Stage 3: Service Runbooks

### Goals
- Create runbook repository for APIs/services
- Enable easy access from homepage
- Link runbooks from incidents and postmortems
- Provide comprehensive service documentation

### 3.1 Runbook List Page

**Tasks:**
- [ ] Create "Runbooks" page accessible from homepage
- [ ] List view of all services/APIs:
  - Service name
  - Owning team
  - Quick description
  - Last updated
  - Search and filter by team
- [ ] "Create New Runbook" button
- [ ] Grid or table layout with clean design

### 3.2 Runbook Detail Page

**Structure:**
- [ ] Header:
  - Service/API name (large, bold)
  - Owning team (with link to team page - optional)
  - Last updated timestamp
- [ ] Sections:
  - **Overview** (description of the service)
  - **Team Information:**
    - Team name
    - Team email/contact
    - On-call rotation (optional)
  - **Monitoring & Links:**
    - Monitoring dashboard links (Grafana, Datadog, etc.)
    - Logs links (Splunk, CloudWatch, etc.)
    - Deployment pipeline
    - Repository link
  - **Architecture:**
    - Upstream services (dependencies)
    - Downstream services (consumers)
    - Infrastructure details
  - **Runbook Procedures:**
    - Common issues and solutions
    - Deployment steps
    - Rollback procedures
    - Health check endpoints
  - **Related Incidents:**
    - List of incidents involving this service
    - Link to postmortems

**Tasks:**
- [ ] Create runbook detail page layout
- [ ] Editable sections (simple text areas or markdown)
- [ ] Upstream/downstream service linking
- [ ] Monitoring links management
- [ ] Related incidents auto-population

### 3.3 Runbook Creation & Editing

**Tasks:**
- [ ] Create runbook form:
  - Service name (required)
  - Team name (dropdown or autocomplete)
  - Team email (required)
  - Description (required)
  - Monitoring links (multiple)
  - Upstream services (multi-select from existing services)
  - Downstream services (multi-select)
  - Runbook procedures (rich text)
- [ ] Form validation
- [ ] Save and publish
- [ ] Edit mode for existing runbooks

### 3.4 Mock Data for Hackathon

**Tasks:**
- [ ] Create 10 mock APIs:
  - Payment API (Team: Payments)
  - User Auth API (Team: Identity)
  - Notification Service (Team: Communications)
  - Order Processing API (Team: Commerce)
  - Inventory API (Team: Commerce)
  - Analytics API (Team: Data)
  - Search API (Team: Discovery)
  - Recommendation Engine (Team: Discovery)
  - Email Service (Team: Communications)
  - Billing API (Team: Payments)
- [ ] Assign to 4-5 teams with realistic data
- [ ] Add monitoring links, descriptions, dependencies

### 3.5 Integration with Incidents & Postmortems

**Tasks:**
- [ ] When `/` command used, link to runbook
- [ ] Hover preview shows runbook summary
- [ ] Click navigates to runbook detail
- [ ] Runbook page shows related incidents
- [ ] Auto-tag incidents with affected services

### Deliverables
- Runbook repository with list and detail views
- 10 mock APIs with complete runbook data
- Integration with incident/postmortem referencing
- Clean, searchable interface

---

## Stage 4: Additional AI Features & Polish

### Goals
- Add more AI capabilities to justify hackathon AI pillar
- Enhance user experience
- Add analytics and insights

### 4.1 AI Pattern Recognition (from original project.txt)

**Tasks:**
- [ ] Create "Insights" dashboard page
- [ ] AI analysis of all incidents:
  - Recurring issues (e.g., "Certificate expiry: 3 incidents")
  - Common root causes
  - Most affected services
  - Team involvement patterns
- [ ] Visualizations:
  - Incident frequency over time
  - MTTD (Mean Time To Detect) trends
  - MTTR (Mean Time To Resolve) trends
  - Severity distribution
- [ ] AI-generated recommendations:
  - "Consider automating certificate renewal"
  - "Payment API has 40% of incidents - investigate"

### 4.2 AI Incident Suggestions

**Tasks:**
- [ ] As Manager on Duty fills incident form, AI suggests:
  - Similar past incidents
  - Likely affected services (based on description)
  - Recommended severity
  - Potential incident lead (based on service ownership)
- [ ] "Similar incidents" panel on incident detail page

### 4.3 AI Timeline Summarization

**Tasks:**
- [ ] "Summarize Activity" button on Investigation tab
- [ ] AI generates concise summary of timeline events
- [ ] Useful for long-running incidents with 50+ updates

### 4.4 Historical Data Import (Optional - if time permits)

**Tasks:**
- [ ] Upload .docx postmortem files
- [ ] AI extracts:
  - Title, date, services
  - Timeline events
  - Root cause
  - Action items
- [ ] Create incident + postmortem from document
- [ ] Bulk import capability

### 4.5 Polish & UX Enhancements

**Tasks:**
- [ ] Loading states and skeletons
- [ ] Error handling and user feedback
- [ ] Responsive design (mobile-friendly)
- [ ] Keyboard shortcuts
- [ ] Dark mode (optional)
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Demo data seeding script

### Deliverables
- AI insights dashboard
- Pattern recognition across incidents
- Enhanced AI features throughout app
- Polished, production-ready UI

---

## Stage 5: Demo Preparation & Deployment

### Goals
- Prepare compelling demo
- Deploy to production
- Create demo script and data

### Tasks
- [ ] Seed database with realistic demo data:
  - 5-10 historical incidents (various severities)
  - 3-5 completed postmortems
  - 10 service runbooks
  - Realistic timeline events
- [ ] Create demo user accounts
- [ ] Build Docker images for production
- [ ] Set up environment variables (OpenAI API key, database credentials)
- [ ] Deploy containers to cloud provider or local server
- [ ] Test all features end-to-end
- [ ] Prepare demo script:
  - Declare major incident
  - Add timeline updates with service references
  - Generate AI postmortem
  - Show AI proofreading
  - Navigate to runbook via hover
  - Show insights dashboard
- [ ] Record backup demo video
- [ ] Prepare presentation slides
- [ ] Test on different devices/browsers

### Deliverables
- Deployed application with demo data
- Demo script and presentation
- Backup video
- Ready for hackathon judging

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** Headless UI (modals, dropdowns, tabs)
- **Icons:** Lucide React
- **Rich Text:** Simple textarea with markdown support (avoid Tiptap complexity)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Database:** PostgreSQL (Alpine-based Docker image ~80MB)
- **Database Migrations:** Liquibase (version-controlled schema management)
- **ORM/Query Builder:** Prisma or raw SQL with pg client
- **Real-time:** Socket.io (WebSocket server)
- **Storage:** MinIO (S3-compatible, containerized) or local filesystem
- **Auth:** Simple JWT-based auth or NextAuth.js (for demo)
- **API Routes:** Next.js API routes or separate Express.js API

### AI
- **Provider:** OpenAI (GPT-4 or GPT-4 Turbo)
- **Use cases:**
  - Postmortem generation
  - Proofreading and quality checks
  - Coaching and methodology guidance
  - Pattern recognition
  - Document parsing (if time permits)

### Containerization
- **Orchestration:** Docker Compose
- **Services:**
  - Frontend (Next.js) - Port 3000
  - Backend API (optional separate service) - Port 4000
  - PostgreSQL - Port 5432
  - Liquibase (migration runner)
  - MinIO (optional) - Port 9000
  - Socket.io server (can be integrated with Next.js or separate)

### Deployment
- **Local Development:** Docker Compose
- **Production:** Docker containers on any cloud provider (AWS, Azure, GCP)
- **Container Registry:** Docker Hub or private registry
- **Environment:** Fully containerized, no external dependencies

---

## Database Schema

### Tables

**incidents**
```sql
- id (uuid, primary key)
- incident_number (text, unique, e.g., "INC-7978")
- title (text)
- description (text)
- severity (enum: minor, major, critical)
- status (enum: active, investigating, mitigated, resolved, closed)
- incident_lead_id (uuid, references users)
- reporter_id (uuid, references users)
- created_at (timestamp)
- detected_at (timestamp)
- mitigated_at (timestamp, nullable)
- resolved_at (timestamp, nullable)
- closed_at (timestamp, nullable)
- problem_statement (text, nullable)
- impact (text, nullable)
- causes (text, nullable)
- steps_to_resolve (text, nullable)
```

**timeline_events**
```sql
- id (uuid, primary key)
- incident_id (uuid, references incidents)
- event_type (enum: accepted, reported, update, status_change, etc.)
- description (text)
- user_id (uuid, references users)
- created_at (timestamp)
- metadata (jsonb, for additional data)
```

**postmortems**
```sql
- id (uuid, primary key)
- incident_id (uuid, references incidents, unique)
- status (enum: draft, under_review, published)
- introduction (text)
- timeline_summary (text)
- root_cause (text)
- impact_analysis (text)
- how_we_fixed_it (text)
- action_items (jsonb, array of items)
- lessons_learned (text)
- created_by_id (uuid, references users)
- created_at (timestamp)
- updated_at (timestamp)
- published_at (timestamp, nullable)
```

**postmortem_images**
```sql
- id (uuid, primary key)
- postmortem_id (uuid, references postmortems)
- image_url (text)
- caption (text, nullable)
- section (text, which section it belongs to)
- created_at (timestamp)
```

**runbooks**
```sql
- id (uuid, primary key)
- service_name (text, unique)
- team_name (text)
- team_email (text)
- description (text)
- monitoring_links (jsonb, array of links)
- upstream_services (jsonb, array of service IDs)
- downstream_services (jsonb, array of service IDs)
- runbook_procedures (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**incident_services** (many-to-many)
```sql
- incident_id (uuid, references incidents)
- runbook_id (uuid, references runbooks)
- created_at (timestamp)
```

**users** (simplified for demo)
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- avatar_url (text, nullable)
- created_at (timestamp)
```

**action_items**
```sql
- id (uuid, primary key)
- incident_id (uuid, references incidents)
- description (text)
- assigned_to_id (uuid, references users, nullable)
- completed (boolean, default false)
- created_at (timestamp)
```

---

## Design System Guidelines

### Colors (incident.io-inspired)
- **Background:** White (#FFFFFF) / Light gray (#F9FAFB)
- **Text:** Dark gray (#111827) for primary, Medium gray (#6B7280) for secondary
- **Borders:** Light gray (#E5E7EB)
- **Accents:**
  - Red (#EF4444) for critical/active
  - Yellow (#F59E0B) for warnings/investigating
  - Blue (#3B82F6) for info/mitigated
  - Green (#10B981) for success/resolved
  - Purple (#8B5CF6) for tags/features

### Typography
- **Font:** System font stack (SF Pro, Segoe UI, Roboto)
- **Headings:** Bold, generous spacing
- **Body:** 16px base, 1.5 line-height
- **Code:** Monospace font for incident numbers, code blocks

### Spacing
- Generous whitespace (padding, margins)
- Max content width: 1200px
- Sidebar width: 320px
- Consistent 4px/8px/16px/24px/32px spacing scale

### Components
- Rounded corners (4px-8px)
- Subtle shadows for cards
- Clean, minimal borders
- Hover states for interactive elements
- Focus states for accessibility

---

## Success Metrics for Hackathon

### Functionality
- ✅ Complete incident creation and management flow
- ✅ AI-generated postmortems with 70%+ pre-fill accuracy
- ✅ Service runbooks with referencing system
- ✅ Real-time timeline updates
- ✅ AI proofreading and coaching

### Design
- ✅ Clean, incident.io-inspired UI
- ✅ Responsive and accessible
- ✅ Smooth interactions and transitions
- ✅ Professional, production-ready appearance

### AI Integration
- ✅ At least 3 distinct AI features:
  1. Postmortem generation
  2. Quality checking/proofreading
  3. Pattern recognition/insights
- ✅ Natural, helpful AI interactions (not gimmicky)

### Demo Impact
- ✅ Solves real team problem
- ✅ Clear time savings demonstration
- ✅ Impressive live demo
- ✅ Scalable architecture for post-hackathon development

---

## Estimated Effort Distribution

**Stage 0 (Foundation):** 3-4 hours
**Stage 1 (Incidents):** 10-12 hours
**Stage 2 (Postmortems):** 8-10 hours
**Stage 3 (Runbooks):** 6-8 hours
**Stage 4 (AI Features):** 6-8 hours
**Stage 5 (Demo Prep):** 3-4 hours

**Total:** 36-46 hours (feasible for 2-3 person team over 48-hour hackathon)

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Start with Stage 0 (Foundation)
4. Work through stages sequentially
5. Adjust scope based on time constraints
6. Focus on polish and demo quality in final hours

**Ready to start coding? Switch to Code mode and begin with Stage 0!**
