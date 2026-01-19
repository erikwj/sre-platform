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

    const row = result.rows[0];
    const postmortem = {
      id: row.id,
      incidentId: row.incident_id,
      status: row.status,
      
      // Business Impact
      businessImpactApplication: row.business_impact_application,
      businessImpactStart: row.business_impact_start,
      businessImpactEnd: row.business_impact_end,
      businessImpactDuration: row.business_impact_duration,
      businessImpactDescription: row.business_impact_description,
      businessImpactAffectedCountries: row.business_impact_affected_countries || [],
      businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
      businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
      
      // Mitigation
      mitigationDescription: row.mitigation_description,
      
      // Causal Analysis
      causalAnalysis: row.causal_analysis || [],
      
      // Action Items
      actionItems: row.action_items || [],
      
      createdBy: {
        name: row.creator_name,
        email: row.creator_email,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
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
      console.log('[DEBUG] Building prompt for AI generation');
      const prompt = buildPostmortemPrompt(incident);
      
      console.log('[DEBUG] Calling Anthropic API...');
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
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

      console.log('[DEBUG] AI response received, length:', generatedContent.length);
      console.log('[DEBUG] AI response content:', generatedContent);

      // Parse the AI response into structured sections
      console.log('[DEBUG] Parsing AI response into sections...');
      const sections = parsePostmortemSections(generatedContent, incident);
      console.log('[DEBUG] Parsed sections:', JSON.stringify(sections, null, 2));

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
          SET business_impact_application = $1,
              business_impact_start = $2,
              business_impact_end = $3,
              business_impact_duration = $4,
              business_impact_description = $5,
              business_impact_affected_countries = $6,
              business_impact_regulatory_reporting = $7,
              business_impact_regulatory_entity = $8,
              mitigation_description = $9,
              causal_analysis = $10,
              action_items = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $12`,
          [
            sections.businessImpactApplication,
            sections.businessImpactStart,
            sections.businessImpactEnd,
            sections.businessImpactDuration,
            sections.businessImpactDescription,
            JSON.stringify(sections.businessImpactAffectedCountries),
            sections.businessImpactRegulatoryReporting,
            sections.businessImpactRegulatoryEntity,
            sections.mitigationDescription,
            JSON.stringify(sections.causalAnalysis),
            JSON.stringify(sections.actionItems),
            postmortemId,
          ]
        );
      } else {
        // Create new postmortem
        const insertResult = await pool.query(
          `INSERT INTO postmortems (
            id, incident_id, status,
            business_impact_application,
            business_impact_start,
            business_impact_end,
            business_impact_duration,
            business_impact_description,
            business_impact_affected_countries,
            business_impact_regulatory_reporting,
            business_impact_regulatory_entity,
            mitigation_description,
            causal_analysis,
            action_items,
            created_by_id
          ) VALUES (
            gen_random_uuid(), $1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING id`,
          [
            params.id,
            sections.businessImpactApplication,
            sections.businessImpactStart,
            sections.businessImpactEnd,
            sections.businessImpactDuration,
            sections.businessImpactDescription,
            JSON.stringify(sections.businessImpactAffectedCountries),
            sections.businessImpactRegulatoryReporting,
            sections.businessImpactRegulatoryEntity,
            sections.mitigationDescription,
            JSON.stringify(sections.causalAnalysis),
            JSON.stringify(sections.actionItems),
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

      const row = postmortemResult.rows[0];
      const postmortem = {
        id: row.id,
        incidentId: row.incident_id,
        status: row.status,
        businessImpactApplication: row.business_impact_application,
        businessImpactStart: row.business_impact_start,
        businessImpactEnd: row.business_impact_end,
        businessImpactDuration: row.business_impact_duration,
        businessImpactDescription: row.business_impact_description,
        businessImpactAffectedCountries: row.business_impact_affected_countries || [],
        businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
        businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
        mitigationDescription: row.mitigation_description,
        causalAnalysis: row.causal_analysis || [],
        actionItems: row.action_items || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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
      businessImpactApplication,
      businessImpactStart,
      businessImpactEnd,
      businessImpactDuration,
      businessImpactDescription,
      businessImpactAffectedCountries,
      businessImpactRegulatoryReporting,
      businessImpactRegulatoryEntity,
      mitigationDescription,
      causalAnalysis,
      actionItems,
      status,
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (businessImpactApplication !== undefined) {
      updates.push(`business_impact_application = $${paramCount++}`);
      values.push(businessImpactApplication);
    }
    if (businessImpactStart !== undefined) {
      updates.push(`business_impact_start = $${paramCount++}`);
      values.push(businessImpactStart);
    }
    if (businessImpactEnd !== undefined) {
      updates.push(`business_impact_end = $${paramCount++}`);
      values.push(businessImpactEnd);
    }
    if (businessImpactDuration !== undefined) {
      updates.push(`business_impact_duration = $${paramCount++}`);
      values.push(businessImpactDuration);
    }
    if (businessImpactDescription !== undefined) {
      updates.push(`business_impact_description = $${paramCount++}`);
      values.push(businessImpactDescription);
    }
    if (businessImpactAffectedCountries !== undefined) {
      updates.push(`business_impact_affected_countries = $${paramCount++}`);
      values.push(JSON.stringify(businessImpactAffectedCountries));
    }
    if (businessImpactRegulatoryReporting !== undefined) {
      updates.push(`business_impact_regulatory_reporting = $${paramCount++}`);
      values.push(businessImpactRegulatoryReporting);
    }
    if (businessImpactRegulatoryEntity !== undefined) {
      updates.push(`business_impact_regulatory_entity = $${paramCount++}`);
      values.push(businessImpactRegulatoryEntity);
    }
    if (mitigationDescription !== undefined) {
      updates.push(`mitigation_description = $${paramCount++}`);
      values.push(mitigationDescription);
    }
    if (causalAnalysis !== undefined) {
      updates.push(`causal_analysis = $${paramCount++}`);
      values.push(JSON.stringify(causalAnalysis));
    }
    if (actionItems !== undefined) {
      updates.push(`action_items = $${paramCount++}`);
      values.push(JSON.stringify(actionItems));
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

    const row = result.rows[0];
    const postmortem = {
      id: row.id,
      incidentId: row.incident_id,
      status: row.status,
      businessImpactApplication: row.business_impact_application,
      businessImpactStart: row.business_impact_start,
      businessImpactEnd: row.business_impact_end,
      businessImpactDuration: row.business_impact_duration,
      businessImpactDescription: row.business_impact_description,
      businessImpactAffectedCountries: row.business_impact_affected_countries || [],
      businessImpactRegulatoryReporting: row.business_impact_regulatory_reporting,
      businessImpactRegulatoryEntity: row.business_impact_regulatory_entity,
      mitigationDescription: row.mitigation_description,
      causalAnalysis: row.causal_analysis || [],
      actionItems: row.action_items || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
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

  return `You are an expert Site Reliability Engineer writing a comprehensive postmortem for a production incident using the Swiss cheese model methodology. Generate a detailed, professional postmortem based on the following incident data:

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

CRITICAL: You must generate ALL sections below with the EXACT format specified. Do not skip any section.

[BUSINESS_IMPACT]
You MUST provide each field on its own line in this exact format:
Application: <name of the affected application or service>
Start Time: ${incident.detected_at}
End Time: ${incident.resolved_at || incident.detected_at}
Description: <A detailed multi-line description of which specific functionalities were not available for end customers/consumers. Explain what users could not do, which features were broken, and the scope of the impact.>
Affected Countries: ["US", "UK", "DE"]
Regulatory Reporting: false
Regulatory Entity: N/A

IMPORTANT:
- Application field is REQUIRED - use the service name from affected services or derive from incident title
- Description MUST be detailed and can span multiple lines
- Use actual ISO timestamps for Start Time and End Time
- Affected Countries should be a valid JSON array

[MITIGATION]
Describe all actions, resilience patterns, or decisions that were taken to mitigate the incident. Be specific about what was done and why. This should be a detailed narrative explaining:
- What immediate actions were taken
- What resilience patterns were applied
- What decisions were made and their rationale
- How the incident was brought under control

[CAUSAL_ANALYSIS]
Provide a systemic causal analysis using the Swiss cheese model. You MUST generate at least 2-4 causal analysis items.

Format as a valid JSON array with this EXACT structure:
[
  {
    "interceptionLayer": "operate",
    "cause": "Alerting gaps",
    "subCause": "Missing alerts for key metrics",
    "description": "Brief explanation of this specific failure",
    "actionItems": [
      {
        "description": "Specific action to address this cause",
        "priority": "high"
      }
    ]
  }
]

Valid interceptionLayer values: define, design, build, test, release, deploy, operate, response
Valid priority values: high, medium, low

IMPORTANT:
- Generate at least 2-4 distinct causal analysis items
- Each item MUST have at least 1-3 action items
- Action items should be specific and actionable
- The JSON must be valid and parseable

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

function parsePostmortemSections(content: string, incident: any): any {
  const sections: any = {
    businessImpactApplication: null,
    businessImpactStart: null,
    businessImpactEnd: null,
    businessImpactDuration: null,
    businessImpactDescription: null,
    businessImpactAffectedCountries: [],
    businessImpactRegulatoryReporting: false,
    businessImpactRegulatoryEntity: null,
    mitigationDescription: null,
    causalAnalysis: [],
    actionItems: [], // Keep for backward compatibility, but will be empty
  };

  console.log('[DEBUG] Parsing business impact section...');
  // Extract Business Impact
  const businessImpactMatch = content.match(/\[BUSINESS_IMPACT\]([\s\S]*?)(?=\[|$)/);
  if (businessImpactMatch) {
    const impactText = businessImpactMatch[1].trim();
    console.log('[DEBUG] Business impact text found:', impactText.substring(0, 300));
    
    // Extract Application - more flexible matching
    const appMatch = impactText.match(/Application:\s*(.+?)(?=\n|$)/i);
    if (appMatch) {
      sections.businessImpactApplication = appMatch[1].trim();
      console.log('[DEBUG] Extracted application:', sections.businessImpactApplication);
    } else {
      // Fallback: try to extract from services or incident title
      if (incident.services && incident.services.length > 0) {
        sections.businessImpactApplication = incident.services[0].serviceName;
        console.log('[DEBUG] Using fallback application from services:', sections.businessImpactApplication);
      } else {
        sections.businessImpactApplication = incident.title || 'Unknown Application';
        console.log('[DEBUG] Using fallback application from title:', sections.businessImpactApplication);
      }
    }
    
    // Extract Start Time
    const startMatch = impactText.match(/Start Time:\s*(.+?)(?=\n|$)/i);
    if (startMatch) {
      try {
        const timeStr = startMatch[1].trim();
        sections.businessImpactStart = new Date(timeStr).toISOString();
        console.log('[DEBUG] Extracted start time:', sections.businessImpactStart);
      } catch (e) {
        console.log('[WARN] Failed to parse start time, using incident detected_at');
        sections.businessImpactStart = incident.detected_at;
      }
    } else {
      sections.businessImpactStart = incident.detected_at;
    }
    
    // Extract End Time
    const endMatch = impactText.match(/End Time:\s*(.+?)(?=\n|$)/i);
    if (endMatch) {
      try {
        const timeStr = endMatch[1].trim();
        sections.businessImpactEnd = new Date(timeStr).toISOString();
        console.log('[DEBUG] Extracted end time:', sections.businessImpactEnd);
      } catch (e) {
        console.log('[WARN] Failed to parse end time, using incident resolved_at');
        sections.businessImpactEnd = incident.resolved_at;
      }
    } else {
      sections.businessImpactEnd = incident.resolved_at;
    }
    
    // Calculate duration in minutes
    if (sections.businessImpactStart && sections.businessImpactEnd) {
      const start = new Date(sections.businessImpactStart);
      const end = new Date(sections.businessImpactEnd);
      sections.businessImpactDuration = Math.floor((end.getTime() - start.getTime()) / 60000);
      console.log('[DEBUG] Calculated duration:', sections.businessImpactDuration, 'minutes');
    }
    
    // Extract Description - improved multi-line support
    // Match from "Description:" until we hit another field or section
    const descMatch = impactText.match(/Description:\s*([\s\S]*?)(?=\nApplication:|Start Time:|End Time:|Affected Countries:|Regulatory Reporting:|Regulatory Entity:|\[|$)/i);
    if (descMatch) {
      sections.businessImpactDescription = descMatch[1].trim();
      console.log('[DEBUG] Extracted description length:', sections.businessImpactDescription.length);
      console.log('[DEBUG] Description preview:', sections.businessImpactDescription.substring(0, 100));
    } else {
      // Fallback: try simpler pattern
      const simpleDescMatch = impactText.match(/Description:\s*(.+)/i);
      if (simpleDescMatch) {
        sections.businessImpactDescription = simpleDescMatch[1].trim();
        console.log('[DEBUG] Extracted description (simple pattern):', sections.businessImpactDescription.substring(0, 100));
      } else {
        console.log('[WARN] No description found in business impact section');
      }
    }
    
    // Extract Affected Countries
    const countriesMatch = impactText.match(/Affected Countries:\s*(\[[\s\S]*?\])/i);
    if (countriesMatch) {
      try {
        sections.businessImpactAffectedCountries = JSON.parse(countriesMatch[1]);
        console.log('[DEBUG] Extracted countries:', sections.businessImpactAffectedCountries);
      } catch (e) {
        console.log('[WARN] Failed to parse affected countries JSON');
        sections.businessImpactAffectedCountries = [];
      }
    }
    
    // Extract Regulatory Reporting
    const regReportingMatch = impactText.match(/Regulatory Reporting:\s*(true|false)/i);
    if (regReportingMatch) {
      sections.businessImpactRegulatoryReporting = regReportingMatch[1].toLowerCase() === 'true';
      console.log('[DEBUG] Regulatory reporting:', sections.businessImpactRegulatoryReporting);
    }
    
    // Extract Regulatory Entity
    const regEntityMatch = impactText.match(/Regulatory Entity:\s*(.+?)(?=\n|$)/i);
    if (regEntityMatch && sections.businessImpactRegulatoryReporting) {
      const entity = regEntityMatch[1].trim().replace(/^["']|["']$/g, '');
      if (entity && entity.toLowerCase() !== 'n/a') {
        sections.businessImpactRegulatoryEntity = entity;
        console.log('[DEBUG] Regulatory entity:', sections.businessImpactRegulatoryEntity);
      }
    }
  } else {
    console.log('[WARN] No business impact section found in AI response');
  }

  console.log('[DEBUG] Parsing mitigation section...');
  // Extract Mitigation
  const mitigationMatch = content.match(/\[MITIGATION\]([\s\S]*?)(?=\[|$)/);
  if (mitigationMatch) {
    sections.mitigationDescription = mitigationMatch[1].trim();
    console.log('[DEBUG] Mitigation description length:', sections.mitigationDescription.length);
  } else {
    console.log('[WARN] No mitigation section found in AI response');
  }

  console.log('[DEBUG] Parsing causal analysis section...');
  // Extract Causal Analysis - improved JSON parsing
  const causalMatch = content.match(/\[CAUSAL_ANALYSIS\]([\s\S]*?)(?=\[|$)/);
  if (causalMatch) {
    let causalText = causalMatch[1].trim();
    console.log('[DEBUG] Causal analysis text found, length:', causalText.length);
    console.log('[DEBUG] First 500 chars of causal text:', causalText.substring(0, 500));
    
    try {
      // Remove markdown code blocks if present (```json ... ```)
      causalText = causalText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      console.log('[DEBUG] After removing markdown code blocks, length:', causalText.length);
      
      // Try to find JSON array - be more flexible with whitespace
      const jsonMatch = causalText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('[DEBUG] Found JSON array, length:', jsonStr.length);
        console.log('[DEBUG] First 200 chars of JSON:', jsonStr.substring(0, 200));
        sections.causalAnalysis = JSON.parse(jsonStr);
        console.log('[DEBUG] Successfully parsed causal analysis items:', sections.causalAnalysis.length);
        
        // Validate structure
        const originalLength = sections.causalAnalysis.length;
        sections.causalAnalysis = sections.causalAnalysis.filter((item: any) => {
          const isValid = item.interceptionLayer && item.cause && item.description;
          if (!isValid) {
            console.log('[WARN] Filtering out invalid causal analysis item:', JSON.stringify(item));
          }
          return isValid;
        });
        console.log('[DEBUG] Valid causal analysis items after filtering:', sections.causalAnalysis.length, 'out of', originalLength);
      } else {
        console.log('[WARN] No valid JSON array found in causal analysis section');
        console.log('[DEBUG] Causal text (first 1000 chars):', causalText.substring(0, 1000));
        
        // Try alternative patterns
        console.log('[DEBUG] Trying alternative JSON extraction patterns...');
        const altMatch1 = causalText.match(/\[[\s\S]*\]/);
        if (altMatch1) {
          console.log('[DEBUG] Alternative pattern 1 found, attempting parse...');
          try {
            sections.causalAnalysis = JSON.parse(altMatch1[0]);
            console.log('[DEBUG] Alternative pattern 1 succeeded! Items:', sections.causalAnalysis.length);
          } catch (e2) {
            console.log('[DEBUG] Alternative pattern 1 failed:', e2 instanceof Error ? e2.message : String(e2));
          }
        }
      }
    } catch (e) {
      console.error('[ERROR] Failed to parse causal analysis JSON:', e);
      console.error('[ERROR] Error details:', e instanceof Error ? e.message : String(e));
      console.error('[ERROR] Causal text that failed (first 1000 chars):', causalText.substring(0, 1000));
      sections.causalAnalysis = [];
    }
  } else {
    console.log('[WARN] No causal analysis section found in AI response');
    console.log('[DEBUG] Searching for [CAUSAL_ANALYSIS] in content...');
    const hasSection = content.includes('[CAUSAL_ANALYSIS]');
    console.log('[DEBUG] Content includes [CAUSAL_ANALYSIS]:', hasSection);
    if (hasSection) {
      const sectionIndex = content.indexOf('[CAUSAL_ANALYSIS]');
      console.log('[DEBUG] Section found at index:', sectionIndex);
      console.log('[DEBUG] Content around section:', content.substring(sectionIndex, sectionIndex + 500));
    }
  }

  // Action items are now nested within causal analysis items
  console.log('[DEBUG] Action items are nested within causal analysis');
  console.log('[DEBUG] Final parsed sections:', {
    hasApplication: !!sections.businessImpactApplication,
    hasDescription: !!sections.businessImpactDescription,
    hasMitigation: !!sections.mitigationDescription,
    causalAnalysisCount: sections.causalAnalysis.length,
  });

  return sections;
}
