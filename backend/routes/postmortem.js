const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// GET /api/incidents/:id/postmortem - Get postmortem for an incident
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      LEFT JOIN users u ON p.created_by_id = u.id
      WHERE p.incident_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({ postmortem: null });
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

    res.json(postmortem);
  } catch (error) {
    console.error('Error fetching postmortem:', error);
    res.status(500).json({ error: 'Failed to fetch postmortem' });
  }
});

// POST /api/incidents/:id/postmortem - Generate or update postmortem
router.post('/', async (req, res) => {
  const startTime = Date.now();
  console.log('[DEBUG] POST /postmortem - Request received at', new Date().toISOString());
  console.log('[DEBUG] Request body:', JSON.stringify(req.body));
  
  try {
    const { action, userId } = req.body;

    if (action === 'generate') {
      console.log('[DEBUG] Starting postmortem generation for incident:', req.params.id);
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
        [req.params.id]
      );

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      const incident = incidentResult.rows[0];

      // Check if incident is resolved or closed
      if (incident.status !== 'resolved' && incident.status !== 'closed') {
        return res.status(400).json({ 
          error: 'Postmortem can only be generated for resolved or closed incidents' 
        });
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

      // Parse the AI response into structured sections
      console.log('[DEBUG] Parsing AI response into sections...');
      const sections = parsePostmortemSections(generatedContent, incident);
      console.log('[DEBUG] Parsed sections:', JSON.stringify(sections, null, 2));

      // Check if postmortem already exists
      const existingResult = await pool.query(
        'SELECT id FROM postmortems WHERE incident_id = $1',
        [req.params.id]
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
            req.params.id,
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

      const duration = Date.now() - startTime;
      console.log('[DEBUG] Postmortem generation completed successfully in', duration, 'ms');
      console.log('[DEBUG] Sending response with postmortem data');
      return res.json(postmortem);
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ERROR] Postmortem generation failed after', duration, 'ms');
    console.error('[ERROR] Error details:', error);
    console.error('[ERROR] Error stack:', error.stack);
    
    // Ensure we always send JSON response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate postmortem', details: error.message });
    } else {
      console.error('[ERROR] Headers already sent, cannot send error response');
    }
  }
});

// PATCH /api/incidents/:id/postmortem - Update postmortem sections
router.patch('/', async (req, res) => {
  try {
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
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
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
    values.push(req.params.id);

    const updateQuery = `
      UPDATE postmortems 
      SET ${updates.join(', ')}
      WHERE incident_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Postmortem not found' });
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

    res.json(postmortem);
  } catch (error) {
    console.error('Error updating postmortem:', error);
    res.status(500).json({ error: 'Failed to update postmortem' });
  }
});

// POST /api/incidents/:id/postmortem/check - AI proofreading and quality check
router.post('/check', async (req, res) => {
  try {
    const { action, postmortem, question, section, currentContent } = req.body;

    if (action === 'check') {
      // AI proofreading and quality check
      const prompt = buildQualityCheckPrompt(postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const feedback = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return res.json({ feedback });
    } else if (action === 'ask') {
      // AI coaching - answer questions about postmortem methodology
      const prompt = buildCoachingPrompt(question, postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const answer = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return res.json({ answer });
    } else if (action === 'expand') {
      // AI section expansion
      const prompt = buildExpansionPrompt(section, currentContent, postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const expandedContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return res.json({ expandedContent });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Error in AI check:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Helper functions
function buildPostmortemPrompt(incident) {
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
${services.map(s => `- ${s.serviceName} (Team: ${s.teamName})`).join('\n') || 'None specified'}

**Timeline of Events:**
${timelineEvents.map(e => `- ${e.createdAt}: [${e.type}] ${e.description} (by ${e.userName})`).join('\n') || 'No timeline events recorded'}

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

function calculateDuration(start, end) {
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

function parsePostmortemSections(content, incident) {
  const sections = {
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
    actionItems: [],
  };

  // Extract Business Impact
  const businessImpactMatch = content.match(/\[BUSINESS_IMPACT\]([\s\S]*?)(?=\[|$)/);
  if (businessImpactMatch) {
    const impactText = businessImpactMatch[1].trim();
    
    const appMatch = impactText.match(/Application:\s*(.+?)(?=\n|$)/i);
    if (appMatch) {
      sections.businessImpactApplication = appMatch[1].trim();
    } else if (incident.services && incident.services.length > 0) {
      sections.businessImpactApplication = incident.services[0].serviceName;
    } else {
      sections.businessImpactApplication = incident.title || 'Unknown Application';
    }
    
    const startMatch = impactText.match(/Start Time:\s*(.+?)(?=\n|$)/i);
    if (startMatch) {
      try {
        sections.businessImpactStart = new Date(startMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactStart = incident.detected_at;
      }
    } else {
      sections.businessImpactStart = incident.detected_at;
    }
    
    const endMatch = impactText.match(/End Time:\s*(.+?)(?=\n|$)/i);
    if (endMatch) {
      try {
        sections.businessImpactEnd = new Date(endMatch[1].trim()).toISOString();
      } catch (e) {
        sections.businessImpactEnd = incident.resolved_at;
      }
    } else {
      sections.businessImpactEnd = incident.resolved_at;
    }
    
    if (sections.businessImpactStart && sections.businessImpactEnd) {
      const start = new Date(sections.businessImpactStart);
      const end = new Date(sections.businessImpactEnd);
      sections.businessImpactDuration = Math.floor((end.getTime() - start.getTime()) / 60000);
    }
    
    const descMatch = impactText.match(/Description:\s*([\s\S]*?)(?=\nApplication:|Start Time:|End Time:|Affected Countries:|Regulatory Reporting:|Regulatory Entity:|\[|$)/i);
    if (descMatch) {
      sections.businessImpactDescription = descMatch[1].trim();
    }
    
    const countriesMatch = impactText.match(/Affected Countries:\s*(\[[\s\S]*?\])/i);
    if (countriesMatch) {
      try {
        sections.businessImpactAffectedCountries = JSON.parse(countriesMatch[1]);
      } catch (e) {
        sections.businessImpactAffectedCountries = [];
      }
    }
    
    const regReportingMatch = impactText.match(/Regulatory Reporting:\s*(true|false)/i);
    if (regReportingMatch) {
      sections.businessImpactRegulatoryReporting = regReportingMatch[1].toLowerCase() === 'true';
    }
    
    const regEntityMatch = impactText.match(/Regulatory Entity:\s*(.+?)(?=\n|$)/i);
    if (regEntityMatch && sections.businessImpactRegulatoryReporting) {
      const entity = regEntityMatch[1].trim().replace(/^["']|["']$/g, '');
      if (entity && entity.toLowerCase() !== 'n/a') {
        sections.businessImpactRegulatoryEntity = entity;
      }
    }
  }

  // Extract Mitigation
  const mitigationMatch = content.match(/\[MITIGATION\]([\s\S]*?)(?=\[|$)/);
  if (mitigationMatch) {
    sections.mitigationDescription = mitigationMatch[1].trim();
  }

  // Extract Causal Analysis
  const causalMatch = content.match(/\[CAUSAL_ANALYSIS\]([\s\S]*?)(?=\[|$)/);
  if (causalMatch) {
    let causalText = causalMatch[1].trim();
    
    try {
      causalText = causalText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = causalText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        sections.causalAnalysis = JSON.parse(jsonMatch[0]);
        sections.causalAnalysis = sections.causalAnalysis.filter(item => 
          item.interceptionLayer && item.cause && item.description
        );
      }
    } catch (e) {
      console.error('Failed to parse causal analysis JSON:', e);
      sections.causalAnalysis = [];
    }
  }

  return sections;
}

function buildQualityCheckPrompt(postmortem) {
  return `You are an expert SRE reviewing a postmortem document based on the Swiss cheese model methodology. Analyze the following postmortem for completeness, clarity, and quality. Provide specific, actionable feedback.

**Postmortem Content:**

**Business Impact:**
- Application: ${postmortem.businessImpactApplication || '(Empty)'}
- Start Time: ${postmortem.businessImpactStart || '(Empty)'}
- End Time: ${postmortem.businessImpactEnd || '(Empty)'}
- Duration: ${postmortem.businessImpactDuration ? `${postmortem.businessImpactDuration} minutes` : '(Empty)'}
- Description: ${postmortem.businessImpactDescription || '(Empty)'}
- Affected Countries: ${JSON.stringify(postmortem.businessImpactAffectedCountries || [])}
- Regulatory Reporting: ${postmortem.businessImpactRegulatoryReporting ? 'Yes' : 'No'}
- Regulatory Entity: ${postmortem.businessImpactRegulatoryEntity || 'N/A'}

**Mitigation:**
${postmortem.mitigationDescription || '(Empty)'}

**Causal Analysis (Swiss Cheese Model):**
${postmortem.causalAnalysis && postmortem.causalAnalysis.length > 0
  ? JSON.stringify(postmortem.causalAnalysis, null, 2)
  : '(Empty)'}

---

Please provide a structured quality assessment with the following format:

**Overall Quality Score:** [Rate 1-10]

**Strengths:**
- [List what's done well]

**Issues Found:**
- [List specific problems with severity: ✅ Good, ⚠️ Needs Improvement, ❌ Critical Issue]

**Specific Recommendations:**
- [Provide actionable suggestions for improvement]

Focus on:
1. Completeness (are all sections filled with sufficient detail?)
2. Clarity (is the writing clear and understandable?)
3. Business impact clarity (is it clear what users/customers experienced?)
4. Mitigation detail (are the actions taken well documented?)
5. Systemic analysis (does the causal analysis identify multiple layers of failure?)
6. Actionability (are action items specific, measurable, and assigned to appropriate layers?)
7. Learning value (does it provide insights for future prevention?)

Be constructive and specific. Flag sections with only 1-2 sentences as insufficient. Evaluate whether the Swiss cheese model is properly applied with multiple interception layers identified.`;
}

function buildCoachingPrompt(question, postmortem) {
  // Count total action items across all causal analysis entries
  const totalActionItems = postmortem.causalAnalysis?.reduce((sum, item) =>
    sum + (item.actionItems?.length || 0), 0) || 0;

  return `You are an expert SRE coach helping someone write a better postmortem using the Swiss cheese model methodology. Answer their question with practical, actionable guidance.

**User's Question:**
${question}

**Current Postmortem Context:**
This postmortem follows the Swiss cheese model approach with systemic causal analysis:
- Business Impact: ${postmortem.businessImpactDescription ? 'Written' : 'Empty'}
- Mitigation: ${postmortem.mitigationDescription ? 'Written' : 'Empty'}
- Causal Analysis: ${postmortem.causalAnalysis?.length || 0} interception layers identified
- Action Items: ${totalActionItems} items across all layers

**Postmortem Structure:**
The postmortem uses three main sections:
1. **Business Impact** - Documents what happened from users' or business perspective (service downtime, degraded performance, affected customers, revenue impact, etc.)
2. **Mitigation** - Describes actions, resilience patterns, or decisions taken to mitigate the incident
3. **Causal Analysis** - Uses Swiss cheese model to identify systemic failures across multiple interception layers (define, design, build, test, release, deploy, operate, response)

Provide a helpful, concise answer (2-4 paragraphs) that:
1. Directly addresses their question
2. Provides practical examples if relevant
3. References the Swiss cheese model and systemic thinking
4. Suggests how to apply this to their current postmortem
5. Emphasizes identifying multiple layers of failure rather than a single root cause

Be encouraging and educational. Help them understand that effective postmortems identify systemic issues across the software development lifecycle, not just immediate technical causes.`;
}

function buildExpansionPrompt(section, currentContent, postmortem) {
  const sectionNames = {
    businessImpactDescription: 'Business Impact Description',
    mitigationDescription: 'Mitigation Description',
  };

  const sectionGuidance = {
    businessImpactDescription: `Focus on:
- Which specific functionalities were unavailable for end customers/consumers
- What users could not do and which features were broken
- The scope and scale of the impact (number of users, geographic regions, business functions)
- Any revenue, compliance, or reputational impact`,
    mitigationDescription: `Focus on:
- Immediate actions taken to contain or resolve the incident
- Resilience patterns applied (circuit breakers, fallbacks, rate limiting, etc.)
- Key decisions made and their rationale
- How the incident was brought under control
- Timeline of mitigation steps`,
  };

  return `You are an expert SRE helping expand a postmortem section using the Swiss cheese model methodology. The user wants to expand the "${sectionNames[section] || section}" section.

**Current Content:**
${currentContent || '(Empty)'}

**Full Postmortem Context:**
- Incident: ${postmortem.incidentId || 'Unknown'}
- Application: ${postmortem.businessImpactApplication || 'Unknown'}
- Duration: ${postmortem.businessImpactDuration ? `${postmortem.businessImpactDuration} minutes` : 'Unknown'}

**Section Guidance:**
${sectionGuidance[section] || 'Provide more technical detail and specificity'}

Please expand this section with:
1. More technical detail and specificity
2. Relevant metrics or data points (if applicable)
3. Clear, professional language
4. 2-3 paragraphs of comprehensive content
5. Focus on systemic understanding rather than blame

Maintain the same tone and style as the original. Add substance without being verbose. Focus on providing value to future readers who want to learn from this incident and prevent similar issues.

Return only the expanded content, without any preamble or explanation.`;
}

module.exports = router;
