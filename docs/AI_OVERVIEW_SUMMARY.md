# AI Overview Summary Feature

## Overview

The AI Overview Summary feature provides an intelligent, executive-level summary of incident details using Vertex AI. Instead of showing raw data fields, the Overview tab now displays an AI-generated analysis that synthesizes the problem statement, impact, causes, and resolution steps into a clear, actionable summary.

## User Experience

### Default View
When users open the Overview tab, they see:
1. **AI Executive Summary** - A 2-3 paragraph synthesis of the incident
2. **Refresh Button** - Regenerate the summary if needed
3. **View Raw Details** - Expandable section to see/edit original fields

### Collapsed Details
The raw incident fields (Problem Statement, Impact, Causes, Steps to Resolve) are hidden by default but accessible via a "View Raw Details" button. This keeps the interface clean while still allowing access to detailed information.

## Features

### 1. Automatic Generation
- AI summary generates automatically when the Overview tab loads
- Only generates if incident has data in any of the four fields
- Uses Vertex AI (Gemini) for analysis

### 2. Manual Refresh
- Users can click the "Refresh" button to regenerate the summary
- Useful after updating incident details
- Shows a spinning animation while generating

### 3. Collapsible Details
- "View Raw Details" button toggles visibility of original fields
- Users can still edit Problem Statement, Impact, Causes, and Steps to Resolve
- Changes to these fields update the incident and can be used to regenerate the summary

### 4. Visual Design
- Blue gradient background for the AI summary section
- Sparkles icon to indicate AI-generated content
- Clean, modern UI with smooth transitions
- Loading states and error handling

## Technical Implementation

### Backend API

**New Endpoint:** `POST /api/incidents/:id/summary`

**Location:** `backend/routes/incidents.js`

**Purpose:** Generates an AI-powered executive summary of the incident

**Request:**
```http
POST /api/incidents/:id/summary
Content-Type: application/json
```

**Response:**
```json
{
  "summary": "The incident summary text...",
  "hasData": true,
  "generatedAt": "2026-02-09T09:55:00.000Z"
}
```

**AI Prompt Strategy:**
```javascript
systemPrompt = `You are an expert SRE analyzing incident reports.
Focus on:
- What happened (in simple terms)
- The severity and urgency
- Key impact points
- Root causes identified
- Resolution approach
- Current status

Keep the summary professional, actionable, and easy to understand.
Use 2-3 paragraphs maximum.`
```

**Data Included:**
- Incident number and title
- Severity and status
- Timestamps (created, detected, mitigated, resolved)
- Problem statement
- Impact description
- Root causes
- Resolution steps

### Frontend Component

**Updated Component:** `app/incidents/[id]/components/OverviewTab.tsx`

**New State Variables:**
```typescript
const [aiSummary, setAiSummary] = useState<string>('');
const [loadingSummary, setLoadingSummary] = useState(false);
const [showDetails, setShowDetails] = useState(false);
const [summaryError, setSummaryError] = useState<string | null>(null);
```

**Key Functions:**

1. **`generateAISummary()`**
   - Calls the backend API to generate summary
   - Handles loading states and errors
   - Updates the UI with the generated summary

2. **Auto-generation useEffect**
   - Triggers when component loads with incident data
   - Only runs if data exists and summary hasn't been generated yet

**UI Sections:**

1. **AI Summary Card**
   - Gradient background (blue-50 to indigo-50)
   - Sparkles icon for visual indication
   - Refresh button for regeneration
   - Loading spinner during generation
   - Error message display

2. **Toggle Button**
   - "View Raw Details" / "Hide Raw Details"
   - Chevron icons for visual feedback
   - Smooth expand/collapse animation

3. **Collapsible Details Section**
   - Contains original four text fields
   - Editable when expanded
   - Styled with white background to differentiate from summary

## Usage

### For Users

1. **Navigate to an incident** from the incidents list
2. **Click the Overview tab** (if not already selected)
3. **View the AI Summary** at the top of the page
4. **Click "View Raw Details"** to see or edit the original fields
5. **Click "Refresh"** after making changes to regenerate the summary

### For Developers

**To customize the AI prompt:**
Edit the `systemPrompt` in `backend/routes/incidents.js`:
```javascript
const systemPrompt = `Your custom prompt here...`;
```

**To adjust summary appearance:**
Edit the styles in `app/incidents/[id]/components/OverviewTab.tsx`:
```tsx
<div className="bg-gradient-to-br from-blue-50 to-indigo-50...">
```

**To change when summary auto-generates:**
Modify the useEffect dependency array:
```typescript
useEffect(() => {
  // Your logic here
}, [dependencies]);
```

## Benefits

### 1. Improved Readability
- Executives and stakeholders get a quick understanding without parsing technical details
- Key information is synthesized and prioritized

### 2. Reduced Cognitive Load
- Users don't need to read through multiple text fields
- Most relevant information is surfaced first

### 3. Maintains Flexibility
- Raw details are still accessible for those who need them
- All original editing capabilities remain intact

### 4. AI-Powered Insights
- Vertex AI identifies key patterns and relationships
- Professional tone appropriate for stakeholder communication
- Consistent summary quality across all incidents

### 5. Time Savings
- Incident commanders don't need to write separate executive summaries
- Automatic generation as incidents are documented

## Error Handling

### No Data Available
If incident has no details:
```
"No incident details available yet. Please fill in the Problem Statement, 
Impact, Causes, or Steps to Resolve fields to generate an AI summary."
```

### API Error
If AI service fails:
```
"Failed to generate AI summary. Please try again."
```
User can click "Refresh" to retry.

### Loading State
Shows animated spinner with message:
```
"Analyzing incident data..."
```

## Performance Considerations

### Caching
- Summary is generated once on load and cached in component state
- Only regenerates when user explicitly clicks "Refresh"
- Prevents unnecessary API calls

### Async Loading
- Summary generation is non-blocking
- Users can interact with other parts of the page while waiting
- Typical generation time: 2-5 seconds

### AI Service Timeout
- Backend has 5-minute timeout for AI operations
- Prevents hung requests
- Configured in `backend/server.js`

## Future Enhancements

Potential improvements:

1. **Persistent Summary Storage**
   - Store generated summaries in database
   - Show last generated timestamp
   - Option to view summary history

2. **Summary Comparison**
   - Show how summary changed over time
   - Track incident evolution

3. **Custom Summary Templates**
   - Different summary styles (technical, executive, customer-facing)
   - User-selectable templates

4. **Smart Regeneration**
   - Auto-regenerate when significant fields change
   - Debounced to avoid excessive API calls

5. **Export Options**
   - Copy summary to clipboard
   - Include in status page updates
   - Email notifications with summary

6. **Multi-language Support**
   - Generate summaries in different languages
   - Locale-aware formatting

7. **Severity-Aware Tone**
   - Adjust summary tone based on incident severity
   - More urgency for critical incidents

## Testing

### Manual Testing

1. **Test with existing incident:**
   ```
   - Navigate to an incident with filled details
   - Verify summary generates automatically
   - Check summary quality and relevance
   ```

2. **Test with empty incident:**
   ```
   - Create new incident
   - Verify empty state message shows
   - Fill in details and click Refresh
   - Verify summary generates
   ```

3. **Test error handling:**
   ```
   - Temporarily stop backend
   - Try to generate summary
   - Verify error message displays
   - Restart backend and retry
   ```

4. **Test collapsible section:**
   ```
   - Click "View Raw Details"
   - Verify section expands smoothly
   - Edit a field
   - Click "Hide Raw Details"
   - Verify section collapses
   ```

### API Testing

Test the endpoint directly:
```bash
curl -X POST http://localhost:3001/api/incidents/:id/summary \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "summary": "AI-generated summary text...",
  "hasData": true,
  "generatedAt": "2026-02-09T09:55:00.000Z"
}
```

## Troubleshooting

### Summary Not Generating

1. **Check AI service configuration:**
   - Verify `google-service-account-key.json` exists
   - Check backend logs for AI service initialization

2. **Verify API endpoint:**
   ```bash
   docker compose logs backend | grep "summary"
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for network errors
   - Check API response

### Summary Quality Issues

1. **Review incident data:**
   - Ensure fields contain meaningful information
   - More detailed input = better summary

2. **Adjust AI temperature:**
   - Lower temperature (0.1-0.3) = more focused
   - Higher temperature (0.5-0.7) = more creative

3. **Modify prompt:**
   - Edit `systemPrompt` in backend route
   - Add more specific instructions
   - Include examples

### Performance Issues

1. **Check AI service response time:**
   - Monitor backend logs for timing
   - Typical: 2-5 seconds

2. **Network latency:**
   - Check connection to Vertex AI
   - Verify no firewall blocking

3. **Timeout errors:**
   - Increase timeout in `backend/server.js` if needed
   - Current: 5 minutes (300000ms)

## Related Files

- **Backend Route:** `backend/routes/incidents.js`
- **Frontend Component:** `app/incidents/[id]/components/OverviewTab.tsx`
- **AI Service:** `backend/services/aiService.js`
- **Knowledge Graph Service:** `backend/services/knowledgeGraphService.js` (similar AI usage)

---

**Created:** February 9, 2026
**Last Updated:** February 9, 2026
**Feature Version:** 1.0
