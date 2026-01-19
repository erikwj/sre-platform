import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT i.*,
        json_build_object('id', u1.id, 'name', u1.name, 'email', u1.email, 'avatar_url', u1.avatar_url) as incident_lead,
        json_build_object('id', u2.id, 'name', u2.name, 'email', u2.email, 'avatar_url', u2.avatar_url) as reporter,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', te.id,
              'eventType', te.event_type,
              'description', te.description,
              'createdAt', te.created_at,
              'metadata', te.metadata,
              'user', json_build_object('id', u.id, 'name', u.name, 'email', u.email)
            ) ORDER BY te.created_at DESC
          ) FROM timeline_events te
          LEFT JOIN users u ON te.user_id = u.id
          WHERE te.incident_id = i.id), '[]'
        ) as timeline_events,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ai.id,
              'description', ai.description,
              'completed', ai.completed,
              'createdAt', ai.created_at,
              'assignedTo', CASE WHEN ai.assigned_to_id IS NOT NULL 
                THEN json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                ELSE NULL END
            ) ORDER BY ai.created_at ASC
          ) FROM action_items ai
          LEFT JOIN users u ON ai.assigned_to_id = u.id
          WHERE ai.incident_id = i.id), '[]'
        ) as action_items,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'runbook', json_build_object(
                'id', r.id,
                'serviceName', r.service_name,
                'teamName', r.team_name,
                'description', r.description
              )
            )
          ) FROM incident_services isr
          JOIN runbooks r ON isr.runbook_id = r.id
          WHERE isr.incident_id = i.id), '[]'
        ) as services
       FROM incidents i
       LEFT JOIN users u1 ON i.incident_lead_id = u1.id
       LEFT JOIN users u2 ON i.reporter_id = u2.id
       WHERE i.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    const incident = result.rows[0];
    
    // Transform to match expected format (snake_case to camelCase)
    const transformed = {
      id: incident.id,
      incidentNumber: incident.incident_number,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.created_at,
      detectedAt: incident.detected_at,
      mitigatedAt: incident.mitigated_at,
      resolvedAt: incident.resolved_at,
      closedAt: incident.closed_at,
      problemStatement: incident.problem_statement,
      impact: incident.impact,
      causes: incident.causes,
      stepsToResolve: incident.steps_to_resolve,
      incidentLead: incident.incident_lead,
      reporter: incident.reporter,
      timelineEvents: incident.timeline_events,
      actionItems: incident.action_items,
      services: incident.services,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching incident:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incident' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    console.log('[DEBUG] PATCH incident - received body:', body);
    const {
      status,
      problemStatement,
      impact,
      causes,
      stepsToResolve,
      title,
      description,
      severity,
    } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      
      // Update timestamp based on status
      if (status === 'mitigated') {
        updates.push(`mitigated_at = NOW()`);
      } else if (status === 'resolved') {
        updates.push(`resolved_at = NOW()`);
      } else if (status === 'closed') {
        updates.push(`closed_at = NOW()`);
      }
    }
    
    if (problemStatement !== undefined) {
      updates.push(`problem_statement = $${paramCount++}`);
      values.push(problemStatement);
    }
    if (impact !== undefined) {
      updates.push(`impact = $${paramCount++}`);
      values.push(impact);
    }
    if (causes !== undefined) {
      updates.push(`causes = $${paramCount++}`);
      values.push(causes);
    }
    if (stepsToResolve !== undefined) {
      updates.push(`steps_to_resolve = $${paramCount++}`);
      values.push(stepsToResolve);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (severity !== undefined) {
      updates.push(`severity = $${paramCount++}`);
      values.push(severity);
    }

    values.push(params.id);

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // If status changed, create a timeline event
    if (status !== undefined) {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1',
        ['manager@example.com']
      );

      if (userResult.rows.length > 0) {
        await client.query(
          `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [params.id, 'status_change', `Status changed to ${status}`, userResult.rows[0].id, JSON.stringify({ newStatus: status })]
        );
      }
    }

    await client.query('COMMIT');

    const updatedIncident = result.rows[0];
    
    // Transform snake_case to camelCase for response
    const transformed = {
      ...updatedIncident,
      problemStatement: updatedIncident.problem_statement,
      stepsToResolve: updatedIncident.steps_to_resolve,
      incidentNumber: updatedIncident.incident_number,
      detectedAt: updatedIncident.detected_at,
      mitigatedAt: updatedIncident.mitigated_at,
      resolvedAt: updatedIncident.resolved_at,
      closedAt: updatedIncident.closed_at,
      createdAt: updatedIncident.created_at,
    };

    console.log('[DEBUG] PATCH incident - returning transformed:', transformed);

    return NextResponse.json(transformed);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating incident:', error);
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await pool.query('DELETE FROM incidents WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    return NextResponse.json(
      { error: 'Failed to delete incident' },
      { status: 500 }
    );
  }
}
