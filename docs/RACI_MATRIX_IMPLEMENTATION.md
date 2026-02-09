# RACI Matrix Implementation

## Overview

This document describes the implementation of the RACI Matrix feature integrated with ServiceNow data in the SRE Platform. The RACI matrix is displayed on the incident share update page and allows users to tag ServiceNow users and groups using the `/reference` command.

## What is RACI?

RACI is a responsibility assignment matrix that defines roles and responsibilities:

- **R**esponsible: Those who do the work to complete the task
- **A**ccountable: The one ultimately answerable for the correct completion
- **C**onsulted: Those whose opinions are sought
- **I**nformed: Those who are kept up-to-date on progress

## Implementation Details

### Backend Components

#### 1. ServiceNow Service Extensions (`backend/services/serviceNowService.js`)

Added three new methods to fetch data from ServiceNow:

##### `getGroupMembers(groupName)`
Fetches members of a specific ServiceNow group by name.

**Parameters:**
- `groupName` (string): Name of the group (e.g., "Network CAB Managers")

**Returns:**
```javascript
[
  {
    sys_id: string,
    name: string,
    email: string,
    title: string
  }
]
```

##### `getAssignmentGroups(limit = 10)`
Fetches active assignment groups from ServiceNow.

**Parameters:**
- `limit` (number): Maximum number of groups to return (default: 10)

**Returns:**
```javascript
[
  {
    sys_id: string,
    name: string,
    description: string,
    manager: string
  }
]
```

##### `searchUsers(query, limit = 10)`
Searches for active users in ServiceNow by name or email.

**Parameters:**
- `query` (string): Search query
- `limit` (number): Maximum number of users to return (default: 10)

**Returns:**
```javascript
[
  {
    sys_id: string,
    name: string,
    email: string,
    title: string,
    department: string
  }
]
```

#### 2. API Routes (`backend/routes/servicenow.js`)

Added three new endpoints:

##### `GET /api/servicenow/groups/:groupName/members`
Fetches members of a specific group.

**Example:**
```bash
GET http://localhost:3001/api/servicenow/groups/Network%20CAB%20Managers/members
```

##### `GET /api/servicenow/assignment-groups`
Fetches assignment groups.

**Query Parameters:**
- `limit` (optional): Number of groups to return

**Example:**
```bash
GET http://localhost:3001/api/servicenow/assignment-groups?limit=10
```

##### `GET /api/servicenow/users/search`
Searches for users.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of users to return

**Example:**
```bash
GET http://localhost:3001/api/servicenow/users/search?q=john&limit=10
```

### Frontend Components

#### 1. RACI Matrix Component (`app/incidents/[id]/components/RACIMatrix.tsx`)

A new React component that displays the RACI matrix with data from ServiceNow.

**Features:**
- Displays four RACI roles with color-coded sections
- Collapsible sections for each role
- Real-time data fetching from ServiceNow
- Loading and error states
- Responsive design

**RACI Role Configuration:**

| Role | Data Source | Description |
|------|-------------|-------------|
| **Responsible** | Network CAB Managers Group | Managers who do the work |
| **Accountable** | Assignment Groups (first 10) | Groups ultimately answerable |
| **Consulted** | Assignment Groups (different set) | Groups whose opinions are sought |
| **Informed** | Product Management Group | Users kept up-to-date |

**Props:**
- `incidentId` (string): The incident ID

#### 2. Enhanced Investigation Tab (`app/incidents/[id]/components/InvestigationTab.tsx`)

Updated the share update page with:

1. **RACI Matrix Display**: Added the RACI matrix component above the share update form
2. **Enhanced `/reference` Command**: Extended to support three types of references:
   - `/services` - Reference services/APIs (existing)
   - `/users` - Mention ServiceNow users (new)
   - `/groups` - Reference assignment groups (new)

**Command Menu Features:**

##### Services Menu
- Search functionality for services
- Links to runbook pages
- Format: `[Service Name](/runbooks/id)`

##### Users Menu
- Real-time search (minimum 2 characters)
- Displays user name, email, and title
- Format: `@User Name (email@example.com)`

##### Groups Menu
- Lists assignment groups from ServiceNow
- Shows group descriptions
- Format: `@group:Group Name`

## Usage

### Viewing the RACI Matrix

1. Navigate to an incident page
2. Click on the "Investigation" tab
3. The RACI matrix is displayed above the "Share Update" form
4. Click on any role section to expand/collapse and view members

### Using the `/reference` Command

1. In the "Share Update" text area, type `/`
2. A command menu appears with three options:
   - **Services**: Reference a service or API
   - **Users**: Mention a user from ServiceNow
   - **Groups**: Reference an assignment group

3. Select the desired option:

#### Referencing a Service
1. Select "Services"
2. Type to search for a service
3. Click on a service to insert a link

#### Mentioning a User
1. Select "Users"
2. Type at least 2 characters to search
3. Click on a user to mention them

#### Referencing a Group
1. Select "Groups"
2. Browse the list of assignment groups
3. Click on a group to reference it

### Example Update with References

```
Investigating the API timeout issue. 

Affected service: [Payment API](/runbooks/123)
Assigned to: @group:Payment Team
Consulted with: @John Doe (john.doe@example.com)

Will provide updates every 30 minutes.
```

## Configuration

### ServiceNow Requirements

The following ServiceNow groups must exist:
- **Network CAB Managers**: For Responsible role
- **Product Management**: For Informed role

### Environment Variables

Ensure these are set in your backend `.env` file:
```
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your-username
SERVICENOW_PASSWORD=your-password
```

## API Response Examples

### Group Members Response
```json
[
  {
    "sys_id": "abc123",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "title": "Senior Manager"
  }
]
```

### Assignment Groups Response
```json
[
  {
    "sys_id": "def456",
    "name": "Network Operations",
    "description": "Responsible for network infrastructure",
    "manager": "Jane Smith"
  }
]
```

### User Search Response
```json
[
  {
    "sys_id": "ghi789",
    "name": "Alice Johnson",
    "email": "alice.johnson@example.com",
    "title": "DevOps Engineer",
    "department": "Engineering"
  }
]
```

## Error Handling

### Backend
- Returns 400 if ServiceNow integration is not enabled
- Returns 500 with error details if ServiceNow API calls fail
- Logs errors to console for debugging

### Frontend
- Displays loading states while fetching data
- Shows error messages with retry button
- Gracefully handles empty results
- Validates search query length for user search

## Testing

### Manual Testing Steps

1. **Test RACI Matrix Display**
   - Navigate to an incident
   - Verify RACI matrix loads with data
   - Test expand/collapse functionality
   - Verify all four roles display correctly

2. **Test Service Reference**
   - Type `/` in the update field
   - Select "Services"
   - Search for a service
   - Insert and verify the link format

3. **Test User Mention**
   - Type `/` in the update field
   - Select "Users"
   - Search for a user (min 2 chars)
   - Insert and verify the mention format

4. **Test Group Reference**
   - Type `/` in the update field
   - Select "Groups"
   - Browse and select a group
   - Insert and verify the reference format

5. **Test Error Scenarios**
   - Test with ServiceNow disabled
   - Test with invalid group names
   - Test with network errors

### API Testing with curl

```bash
# Test group members
curl http://localhost:3001/api/servicenow/groups/Network%20CAB%20Managers/members

# Test assignment groups
curl http://localhost:3001/api/servicenow/assignment-groups?limit=10

# Test user search
curl "http://localhost:3001/api/servicenow/users/search?q=john&limit=10"
```

## Future Enhancements

1. **Persistent RACI Assignments**: Save RACI assignments per incident
2. **Notification Integration**: Notify users/groups when mentioned
3. **Custom RACI Roles**: Allow customization of RACI roles per organization
4. **Bulk Operations**: Tag multiple users/groups at once
5. **Auto-complete**: Inline auto-complete without command menu
6. **RACI History**: Track changes to RACI assignments over time
7. **Export**: Export RACI matrix to PDF/Excel

## Troubleshooting

### RACI Matrix Not Loading
- Check ServiceNow credentials in backend `.env`
- Verify group names exist in ServiceNow
- Check browser console for errors
- Verify backend API is running on port 3001

### Command Menu Not Appearing
- Ensure you're typing `/` in the text area
- Check for JavaScript errors in console
- Verify the component is properly imported

### No Users/Groups Found
- Verify ServiceNow integration is enabled
- Check that groups/users exist in ServiceNow
- Ensure proper permissions for the ServiceNow user
- Check network connectivity to ServiceNow instance

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         InvestigationTab Component                  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │         RACIMatrix Component                  │  │    │
│  │  │  - Fetches group members                      │  │    │
│  │  │  - Displays 4 RACI roles                      │  │    │
│  │  │  - Collapsible sections                       │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │      Share Update Form                        │  │    │
│  │  │  - /reference command menu                    │  │    │
│  │  │  - Services, Users, Groups                    │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Express)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         ServiceNow Routes                           │    │
│  │  - GET /groups/:name/members                        │    │
│  │  - GET /assignment-groups                           │    │
│  │  - GET /users/search                                │    │
│  └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │      ServiceNow Service                             │    │
│  │  - getGroupMembers()                                │    │
│  │  - getAssignmentGroups()                            │    │
│  │  - searchUsers()                                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ServiceNow REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ServiceNow Instance                       │
│  - sys_user_group (Groups)                                  │
│  - sys_user_grmember (Group Members)                        │
│  - sys_user (Users)                                         │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified/Created

### Created
- `app/incidents/[id]/components/RACIMatrix.tsx` - RACI matrix component
- `docs/RACI_MATRIX_IMPLEMENTATION.md` - This documentation

### Modified
- `backend/services/serviceNowService.js` - Added group and user fetching methods
- `backend/routes/servicenow.js` - Added new API endpoints
- `app/incidents/[id]/components/InvestigationTab.tsx` - Enhanced with RACI matrix and improved /reference command

## Summary

The RACI Matrix implementation provides a comprehensive solution for managing incident responsibilities using ServiceNow data. It integrates seamlessly with the existing incident management workflow and provides an intuitive interface for referencing users, groups, and services in incident updates.
