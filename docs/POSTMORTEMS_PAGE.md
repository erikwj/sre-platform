# Postmortems Page

## Overview

The Postmortems page provides a centralized view of all incident postmortems created in the platform. This page allows teams to review, search, and analyze postmortems from past incidents.

## Features

### 1. List All Postmortems
- Displays all postmortems with key information
- Shows incident number, title, severity, and status
- Includes business impact details and duration
- Lists number of causal factors and action items

### 2. Status Filtering
Filter postmortems by status:
- **All**: Show all postmortems regardless of status
- **Draft**: Show only postmortems in draft state (being written)
- **Published**: Show only published postmortems (finalized)

### 3. Visual Indicators
- **Severity Badges**: Color-coded badges for incident severity (critical, high, medium, low)
- **Status Badges**: Visual indicators for postmortem status (draft, published)
- **Icons**: Intuitive icons for different statuses

### 4. Quick Stats
Bottom summary showing:
- Total number of postmortems
- Number of published postmortems
- Number of draft postmortems

### 5. Direct Navigation
- Click any postmortem card to navigate to the incident details page
- View the full postmortem in the "Postmortem" tab

## Technical Implementation

### Backend API

**New Route:** `backend/routes/postmortems.js`

**Endpoints:**

1. **GET /api/postmortems**
   - Lists all postmortems with incident data
   - Optional query parameter: `?status=draft|published`
   - Returns array of postmortem objects with related incident information

2. **GET /api/postmortems/:id**
   - Gets a specific postmortem by ID
   - Returns single postmortem object with full details

**Database Query:**
```sql
SELECT 
  p.*,
  i.incident_number,
  i.title as incident_title,
  i.severity as incident_severity,
  i.status as incident_status,
  u.name as creator_name,
  u.email as creator_email
FROM postmortems p
INNER JOIN incidents i ON p.incident_id = i.id
LEFT JOIN users u ON p.created_by_id = u.id
ORDER BY p.created_at DESC
```

### Frontend Page

**Location:** `app/postmortems/page.tsx`

**Key Components:**
- Navigation bar with links to Incidents, Postmortems, and Runbooks
- Status filter buttons
- Postmortem cards with hover effects
- Loading and empty states
- Stats summary footer

**State Management:**
```typescript
const [postmortems, setPostmortems] = useState<Postmortem[]>([]);
const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState<string>('all');
```

## Usage

### Accessing the Page

1. From the homepage, click "Postmortems" in the navigation
2. Or navigate directly to: `http://localhost:3000/postmortems`

### Filtering Postmortems

1. Click the status filter buttons at the top:
   - **All**: Shows all postmortems
   - **Draft**: Shows only draft postmortems
   - **Published**: Shows only published postmortems

2. The list automatically updates when you change filters

### Viewing a Postmortem

1. Click on any postmortem card
2. You'll be redirected to the incident details page
3. Navigate to the "Postmortem" tab to view the full postmortem

## Data Model

### Postmortem Type
```typescript
type Postmortem = {
  id: string;
  incidentId: string;
  incidentNumber: string;
  incidentTitle: string;
  incidentSeverity: string;
  incidentStatus: string;
  status: string;
  businessImpactApplication?: string;
  businessImpactDescription?: string;
  businessImpactDuration?: number;
  causalAnalysis?: any[];
  actionItems?: any[];
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
```

## Styling

### Color Codes

**Severity Colors:**
- Critical: Red (`bg-red-100 text-red-800`)
- High: Orange (`bg-orange-100 text-orange-800`)
- Medium: Yellow (`bg-yellow-100 text-yellow-800`)
- Low: Blue (`bg-blue-100 text-blue-800`)

**Status Colors:**
- Published: Green (`bg-green-100 text-green-800`)
- Draft: Gray (`bg-gray-100 text-gray-800`)

### Layout
- Max width: `max-w-7xl` (1280px)
- Padding: `px-8 py-8`
- Card hover effect with border color and shadow

## Future Enhancements

Potential improvements for the postmortems page:

1. **Search Functionality**
   - Full-text search across postmortem content
   - Search by incident number, title, or description

2. **Advanced Filtering**
   - Filter by severity
   - Filter by date range
   - Filter by creator
   - Filter by application/service

3. **Sorting Options**
   - Sort by creation date
   - Sort by published date
   - Sort by incident severity
   - Sort by impact duration

4. **Pagination**
   - Implement pagination for large lists
   - Configurable page size

5. **Export Functionality**
   - Export postmortems to PDF
   - Export to Word document
   - Bulk export

6. **Analytics Dashboard**
   - Postmortem trends over time
   - Common root causes
   - Action item completion rates
   - Mean time to postmortem completion

7. **Tags and Categories**
   - Add tags to postmortems
   - Group by service/team
   - Custom categorization

8. **Collaboration Features**
   - Comment on postmortems
   - Review workflow
   - Approval process

## Troubleshooting

### Postmortems Not Loading

1. Check backend is running:
   ```bash
   docker compose ps
   ```

2. Verify backend logs:
   ```bash
   docker compose logs backend
   ```

3. Test API endpoint directly:
   ```bash
   curl http://localhost:3001/api/postmortems
   ```

### Empty List

If no postmortems appear:
1. Verify postmortems exist in the database
2. Check the filter setting (try "All")
3. Create a new incident and generate a postmortem

### Navigation Not Working

Ensure the navigation links are updated in:
- `app/page.tsx` (homepage)
- `app/incidents/page.tsx`
- `app/runbooks/page.tsx`

## Related Files

- Backend Route: `backend/routes/postmortems.js`
- Backend Server: `backend/server.js`
- Frontend Page: `app/postmortems/page.tsx`
- Homepage: `app/page.tsx`
- Database Schema: `liquibase/changesets/003-postmortem-swiss-cheese-schema.xml`
- Prisma Schema: `prisma/schema.prisma`

---

**Created:** February 9, 2026
**Last Updated:** February 9, 2026
