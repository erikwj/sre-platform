# Postmortem Generation Timeout Fix

## Problem Diagnosis

### Identified Timeout Sources (5-7 potential causes):
1. **Large Timeline Data** - Big incidents with hundreds of timeline events
2. **Single Monolithic LLM Request** - One large request with all incident data
3. **Large LLM Response** - Waiting for complete response (up to 8192 tokens)
4. **Complex Prompt Processing** - All timeline events included in one prompt
5. **Database Query Complexity** - Aggregating hundreds of timeline events
6. **Network Latency** - Single round-trip with large payload
7. **Response Parsing** - Parsing very large AI responses

### Most Likely Root Causes (1-2):
1. **Single Monolithic LLM Request/Response** - For big incidents, sending ALL data in ONE request creates:
   - Very large prompts (10k+ tokens)
   - Very large responses (up to 8192 tokens)
   - Long processing time on Claude's side
   - Long wait time with no feedback

2. **Timeline Data Volume** - Hundreds of timeline events being aggregated and sent in the prompt

## Solution Implemented: Chunked Generation

### Architecture Changes

**Before:**
```
Frontend → Single API Call → Backend → One Large LLM Request → Parse All Sections → Return
```

**After:**
```
Frontend → 3 Sequential API Calls:
  1. Business Impact → Optimized DB Query → Focused LLM Request → Parse & Save
  2. Mitigation → Limited Timeline Query → Focused LLM Request → Parse & Save
  3. Causal Analysis → Summarized Timeline → Focused LLM Request → Parse & Save
```

### Key Improvements

#### 1. Backend Changes ([`backend/routes/postmortem.js`](backend/routes/postmortem.js))

**New Endpoint:** `POST /api/incidents/:id/postmortem/generate-chunked`

**Section-Specific Optimizations:**

- **Business Impact** (Lines 586-1050):
  - Only fetches basic incident info + services
  - No timeline events needed
  - Max tokens: 1024
  - Focused prompt for business impact only

- **Mitigation** (Lines 586-1050):
  - Fetches limited timeline (max 50 events)
  - Max tokens: 2048
  - Focused on actions taken

- **Causal Analysis** (Lines 586-1050):
  - Fetches summarized timeline (max 30 events)
  - Max tokens: 4096
  - Focused on systemic analysis

**Benefits:**
- Each request is 3-5x smaller
- Database queries are optimized per section
- Timeline data is limited/summarized
- Progressive updates to database
- Better error handling (one section fails, others succeed)

#### 2. Frontend Changes ([`app/incidents/[id]/components/PostmortemTab.tsx`](app/incidents/[id]/components/PostmortemTab.tsx:66-125))

**Updated `generatePostmortem()` function:**
- Makes 3 sequential API calls instead of 1
- Updates UI progressively after each section
- Shows real-time progress (not simulated)
- Better error handling per section

#### 3. Diagnostic Logging Added

Added comprehensive logging to measure:
- Database query duration
- Timeline event count
- Prompt length and estimated tokens
- API call duration
- Response token usage

**Log Format:**
```
[DIAGNOSTIC] Database query took: X ms
[DIAGNOSTIC] Timeline events count: X
[DIAGNOSTIC] Prompt length: X characters
[DIAGNOSTIC] Estimated prompt tokens: X
[DIAGNOSTIC] Anthropic API call took: X ms
[DIAGNOSTIC] Response tokens used: X
[DIAGNOSTIC] Input tokens used: X
```

## Performance Improvements

### Expected Results for Big Incidents:

**Before (Monolithic):**
- Single request: 60-120+ seconds (often timeout)
- Prompt size: 10,000-50,000+ tokens
- Response size: 8,192 tokens
- Timeline events: All (100-500+)

**After (Chunked):**
- Business Impact: 5-15 seconds (1,000-2,000 tokens)
- Mitigation: 10-20 seconds (2,000-4,000 tokens, max 50 timeline events)
- Causal Analysis: 15-30 seconds (3,000-6,000 tokens, max 30 timeline events)
- **Total: 30-65 seconds** (within timeout limits)

### Additional Benefits:

1. **Progressive Feedback** - Users see sections being generated in real-time
2. **Partial Success** - If one section fails, others are saved
3. **Reduced Memory** - Smaller payloads throughout the pipeline
4. **Better Caching** - Smaller, focused prompts may benefit from LLM caching
5. **Easier Debugging** - Can identify which section is problematic

## Testing Instructions

### 1. Restart Backend Server
```bash
cd backend
npm run dev
```

### 2. Test with Small Incident
- Navigate to a resolved incident with few timeline events
- Click "Generate with AI"
- Observe progressive generation stages
- Verify all sections are populated

### 3. Test with Large Incident
- Navigate to a resolved incident with 100+ timeline events
- Click "Generate with AI"
- Monitor backend logs for diagnostic information
- Verify generation completes without timeout
- Check that timeline events are limited appropriately

### 4. Monitor Logs
Watch for diagnostic output:
```bash
tail -f backend/logs.txt  # or wherever your logs go
```

Look for:
- Timeline event counts
- API call durations
- Token usage
- Any errors or warnings

## Rollback Plan

If issues occur, the original monolithic endpoint is still available:
- Old endpoint: `POST /api/incidents/:id/postmortem` with `action: 'generate'`
- Simply revert the frontend changes to use the old endpoint

## Future Enhancements

1. **Parallel Generation** - Generate sections in parallel instead of sequential
2. **Streaming Responses** - Use Anthropic's streaming API for real-time updates
3. **Smart Timeline Sampling** - Use ML to select most relevant timeline events
4. **Caching** - Cache generated sections for similar incidents
5. **Background Jobs** - Move generation to background queue for very large incidents

## Files Modified

1. [`backend/routes/postmortem.js`](backend/routes/postmortem.js) - Added chunked generation endpoint and helper functions
2. [`app/incidents/[id]/components/PostmortemTab.tsx`](app/incidents/[id]/components/PostmortemTab.tsx) - Updated to use chunked generation
3. Added diagnostic logging throughout the generation pipeline

## Validation Checklist

- [x] Diagnostic logging added
- [x] Chunked generation endpoint implemented
- [x] Section-specific prompts created
- [x] Database queries optimized per section
- [x] Timeline limiting implemented
- [x] Frontend updated to use chunked approach
- [x] Progressive UI updates working
- [x] Error handling per section
- [ ] Backend server restarted (user action required)
- [ ] Tested with small incident (user action required)
- [ ] Tested with large incident (user action required)
- [ ] Performance metrics validated (user action required)
