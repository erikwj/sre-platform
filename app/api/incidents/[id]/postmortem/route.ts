import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// GET /api/incidents/[id]/postmortem - Get postmortem for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      LEFT JOIN users u ON p.created_by_id = u.id
      WHERE p.incident_id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ postmortem: null }, { status: 200 });
    }

    const postmortem = {
      id: result.rows[0].id,
      incidentId: result.rows[0].incident_id,
      status: result.rows[0].status,
      introduction: result.rows[0].introduction,
      timelineSummary: result.rows[0].timeline_summary,
      rootCause: result.rows[0].root_cause,
      impactAnalysis: result.rows[0].impact_analysis,
      howWeFixedIt: result.rows[0].how_we_fixed_it,
      actionItems: result.rows[0].action_items || [],
      lessonsLearned: result.rows[0].lessons_learned,
      createdBy: {
        name: result.rows[0].creator_name,
        email: result.rows[0].creator_email,
      },
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      publishedAt: result.rows[0].published_at,
    };

    return NextResponse.json(postmortem);
  } catch (error) {
    console.error('Error fetching postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to fetch postmortem' },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/postmortem - Generate or update postmortem
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (action === 'generate') {
      // Fetch incident data with all related information
      const incidentResult = await pool.query(
        `SELECT
          i.*,
          il.name as lead_name,
          r.name as reporter_name,
          COALESCE(
            (SELECT json_agg(timeline_data ORDER BY timeline_data->>'createdAt')
             FROM (
               SELECT DISTINCT ON (te.id) jsonb_build_object(
                 'type', te.event_type,
                 'description', te.description,
                 'createdAt', te.created_at,
                 'userName', u.name
               ) as timeline_data
               FROM timeline_events te
               LEFT JOIN users u ON te.user_id = u.id
               WHERE te.incident_id = i.id
             ) timeline_subquery
            ), '[]'::json
          ) as timeline_events,
          COALESCE(
            (SELECT json_agg(DISTINCT jsonb_build_object(
              'serviceName', rb.service_name,
              'teamName', rb.team_name
            ))
             FROM incident_services isr
             LEFT JOIN runbooks rb ON isr.runbook_id = rb.id
             WHERE isr.incident_id = i.id AND rb.id IS NOT NULL
            ), '[]'::json
          ) as services
        FROM incidents i
        LEFT JOIN users il ON i.incident_lead_id = il.id
        LEFT JOIN users r ON i.reporter_id = r.id
        WHERE i.id = $1`,
        [params.id]
      );

      if (incidentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Incident not found' },
          { status: 404 }
        );
      }

      const incident = incidentResult.rows[0];

      // Check if incident is resolved or closed
      if (incident.status !== 'resolved' && incident.status !== 'closed') {
        return NextResponse.json(
          { error: 'Postmortem can only be generated for resolved or closed incidents' },
          { status: 400 }
        );
      }

      // Generate postmortem using Anthropic Claude
      const prompt = buildPostmortemPrompt(incident);
      
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const generatedContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Parse the AI response into structured sections
      const sections = parsePostmortemSections(generatedContent);

      // Check if postmortem already exists
      const existingResult = await pool.query(
        'SELECT id FROM postmortems WHERE incident_id = $1',
        [params.id]
      );

      let postmortemId;

      if (existingResult.rows.length > 0) {
        // Update existing postmortem
        postmortemId = existingResult.rows[0].id;
        await pool.query(
          `UPDATE postmortems 
          SET introduction = $1,
              timeline_summary = $2,
              root_cause = $3,
              impact_analysis = $4,
              how_we_fixed_it = $5,
              action_items = $6,
              lessons_learned = $7,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $8`,
          [
            sections.introduction,
            sections.timelineSummary,
            sections.rootCause,
            sections.impactAnalysis,
            sections.howWeFixedIt,
            JSON.stringify(sections.actionItems),
            sections.lessonsLearned,
            postmortemId,
          ]
        );
      } else {
        // Create new postmortem
        const insertResult = await pool.query(
          `INSERT INTO postmortems (
            id, incident_id, status, introduction, timeline_summary,
            root_cause, impact_analysis, how_we_fixed_it, action_items,
            lessons_learned, created_by_id
          ) VALUES (
            gen_random_uuid(), $1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9
          ) RETURNING id`,
          [
            params.id,
            sections.introduction,
            sections.timelineSummary,
            sections.rootCause,
            sections.impactAnalysis,
            sections.howWeFixedIt,
            JSON.stringify(sections.actionItems),
            sections.lessonsLearned,
            userId,
          ]
        );
        postmortemId = insertResult.rows[0].id;
      }

      // Fetch and return the created/updated postmortem
      const postmortemResult = await pool.query(
        'SELECT * FROM postmortems WHERE id = $1',
        [postmortemId]
      );

      const postmortem = {
        id: postmortemResult.rows[0].id,
        incidentId: postmortemResult.rows[0].incident_id,
        status: postmortemResult.rows[0].status,
        introduction: postmortemResult.rows[0].introduction,
        timelineSummary: postmortemResult.rows[0].timeline_summary,
        rootCause: postmortemResult.rows[0].root_cause,
        impactAnalysis: postmortemResult.rows[0].impact_analysis,
        howWeFixedIt: postmortemResult.rows[0].how_we_fixed_it,
        actionItems: postmortemResult.rows[0].action_items || [],
        lessonsLearned: postmortemResult.rows[0].lessons_learned,
        createdAt: postmortemResult.rows[0].created_at,
        updatedAt: postmortemResult.rows[0].updated_at,
      };

      return NextResponse.json(postmortem);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to generate postmortem' },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id]/postmortem - Update postmortem sections
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      introduction,
      timelineSummary,
      rootCause,
      impactAnalysis,
      howWeFixedIt,
      actionItems,
      lessonsLearned,
      status,
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (introduction !== undefined) {
      updates.push(`introduction = $${paramCount++}`);
      values.push(introduction);
    }
    if (timelineSummary !== undefined) {
      updates.push(`timeline_summary = $${paramCount++}`);
      values.push(timelineSummary);
    }
    if (rootCause !== undefined) {
      updates.push(`root_cause = $${paramCount++}`);
      values.push(rootCause);
    }
    if (impactAnalysis !== undefined) {
      updates.push(`impact_analysis = $${paramCount++}`);
      values.push(impactAnalysis);
    }
    if (howWeFixedIt !== undefined) {
      updates.push(`how_we_fixed_it = $${paramCount++}`);
      values.push(howWeFixedIt);
    }
    if (actionItems !== undefined) {
      updates.push(`action_items = $${paramCount++}`);
      values.push(JSON.stringify(actionItems));
    }
    if (lessonsLearned !== undefined) {
      updates.push(`lessons_learned = $${paramCount++}`);
      values.push(lessonsLearned);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      if (status === 'published') {
        updates.push(`published_at = CURRENT_TIMESTAMP`);
      }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(params.id);

    const updateQuery = `
      UPDATE postmortems 
      SET ${updates.join(', ')}
      WHERE incident_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Postmortem not found' },
        { status: 404 }
      );
    }

    const postmortem = {
      id: result.rows[0].id,
      incidentId: result.rows[0].incident_id,
      status: result.rows[0].status,
      introduction: result.rows[0].introduction,
      timelineSummary: result.rows[0].timeline_summary,
      rootCause: result.rows[0].root_cause,
      impactAnalysis: result.rows[0].impact_analysis,
      howWeFixedIt: result.rows[0].how_we_fixed_it,
      actionItems: result.rows[0].action_items || [],
      lessonsLearned: result.rows[0].lessons_learned,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      publishedAt: result.rows[0].published_at,
    };

    return NextResponse.json(postmortem);
  } catch (error) {
    console.error('Error updating postmortem:', error);
    return NextResponse.json(
      { error: 'Failed to update postmortem' },
      { status: 500 }
    );
  }
}

function buildPostmortemPrompt(incident: any): string {
  const timelineEvents = incident.timeline_events || [];
  const services = incident.services || [];

  return `You are an expert Site Reliability Engineer writing a comprehensive postmortem for a production incident. Generate a detailed, professional postmortem based on the following incident data:

**Incident Details:**
- Incident Number: ${incident.incident_number}
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Incident Lead: ${incident.lead_name || 'Unknown'}
- Reporter: ${incident.reporter_name || 'Unknown'}
- Started: ${incident.detected_at}
- Resolved: ${incident.resolved_at || 'Not yet resolved'}
- Duration: ${calculateDuration(incident.detected_at, incident.resolved_at)}

**Affected Services:**
${services.map((s: any) => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Timeline of Events:**
${timelineEvents.map((e: any) => `- ${e.createdAt}: [${e.type}] ${e.description} (by ${e.userName})`).join('\n') || 'No timeline events recorded'}

**Additional Context:**
- Problem Statement: ${incident.problem_statement || 'Not documented'}
- Impact: ${incident.impact || 'Unknown'}
- Causes: ${incident.causes || 'Under investigation'}
- Steps to Resolve: ${incident.steps_to_resolve || 'Not documented'}

Please generate a comprehensive postmortem with the following sections. Use clear section markers:

[INTRODUCTION]
Provide a concise executive summary of what happened, when it happened, and the overall impact.

[TIMELINE_SUMMARY]
Create a clear timeline of key events from detection to resolution, highlighting critical moments.

[ROOT_CAUSE]
Analyze and explain the root cause of the incident. Be specific and technical where appropriate.

[IMPACT_ANALYSIS]
Detail the impact on services, customers, and business operations. Include metrics if available.

[HOW_WE_FIXED_IT]
Describe the steps taken to resolve the incident, including any workarounds or permanent fixes.

[ACTION_ITEMS]
List 3-5 specific, actionable items to prevent similar incidents. Format as JSON array with objects containing "description" and "priority" (high/medium/low) fields.

[LESSONS_LEARNED]
Reflect on what went well, what didn't, and key takeaways for the team.

Be professional, factual, and constructive. Focus on learning and improvement rather than blame.`;
}

function calculateDuration(start: string, end?: string): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function parsePostmortemSections(content: string): any {
  const sections: any = {
    introduction: '',
    timelineSummary: '',
    rootCause: '',
    impactAnalysis: '',
    howWeFixedIt: '',
    actionItems: [],
    lessonsLearned: '',
  };

  // Extract sections using markers
  const introMatch = content.match(/\[INTRODUCTION\]([\s\S]*?)(?=\[|$)/);
  if (introMatch) sections.introduction = introMatch[1].trim();

  const timelineMatch = content.match(/\[TIMELINE_SUMMARY\]([\s\S]*?)(?=\[|$)/);
  if (timelineMatch) sections.timelineSummary = timelineMatch[1].trim();

  const rootCauseMatch = content.match(/\[ROOT_CAUSE\]([\s\S]*?)(?=\[|$)/);
  if (rootCauseMatch) sections.rootCause = rootCauseMatch[1].trim();

  const impactMatch = content.match(/\[IMPACT_ANALYSIS\]([\s\S]*?)(?=\[|$)/);
  if (impactMatch) sections.impactAnalysis = impactMatch[1].trim();

  const fixedMatch = content.match(/\[HOW_WE_FIXED_IT\]([\s\S]*?)(?=\[|$)/);
  if (fixedMatch) sections.howWeFixedIt = fixedMatch[1].trim();

  const actionItemsMatch = content.match(/\[ACTION_ITEMS\]([\s\S]*?)(?=\[|$)/);
  if (actionItemsMatch) {
    const actionText = actionItemsMatch[1].trim();
    // Try to parse as JSON first
    try {
      const jsonMatch = actionText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        sections.actionItems = JSON.parse(jsonMatch[0]);
      } else {
        // Parse as bullet points
        const items = actionText.split('\n')
          .filter(line => line.trim().match(/^[-*•]\s/))
          .map(line => ({
            description: line.replace(/^[-*•]\s/, '').trim(),
            priority: 'medium',
          }));
        sections.actionItems = items;
      }
    } catch (e) {
      // Fallback: parse as bullet points
      const items = actionText.split('\n')
        .filter(line => line.trim().match(/^[-*•]\s/))
        .map(line => ({
          description: line.replace(/^[-*•]\s/, '').trim(),
          priority: 'medium',
        }));
      sections.actionItems = items;
    }
  }

  const lessonsMatch = content.match(/\[LESSONS_LEARNED\]([\s\S]*?)(?=\[|$)/);
  if (lessonsMatch) sections.lessonsLearned = lessonsMatch[1].trim();

  return sections;
}
