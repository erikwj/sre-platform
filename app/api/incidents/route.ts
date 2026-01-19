import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { incidentNumber, title, description, severity, incidentLead } = body;

    // Validate required fields
    if (!incidentNumber || !title || !description || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Create or get default user
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', incidentLead || 'Manager on Duty']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create the incident
    const incidentResult = await client.query(
      `INSERT INTO incidents (
        incident_number, title, description, severity, status,
        incident_lead_id, reporter_id, detected_at, impact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      RETURNING *`,
      [incidentNumber, title, description, severity, 'active', user.id, user.id, 'Unknown']
    );

    const incident = incidentResult.rows[0];

    // Create initial timeline events
    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, 'reported', `Incident reported: ${title}`, user.id, JSON.stringify({ severity })]
    );

    await client.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, 'accepted', `Incident accepted by ${user.name}`, user.id, JSON.stringify({ role: 'incident_lead' })]
    );

    await client.query('COMMIT');

    // Fetch complete incident with relations
    const completeIncident = await client.query(
      `SELECT i.*, 
        json_build_object('id', u1.id, 'name', u1.name, 'email', u1.email) as incident_lead,
        json_build_object('id', u2.id, 'name', u2.name, 'email', u2.email) as reporter
       FROM incidents i
       LEFT JOIN users u1 ON i.incident_lead_id = u1.id
       LEFT JOIN users u2 ON i.reporter_id = u2.id
       WHERE i.id = $1`,
      [incident.id]
    );

    return NextResponse.json(completeIncident.rows[0], { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating incident:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'An incident with this number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT i.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as incident_lead,
        json_build_object('id', u2.id, 'name', u2.name, 'email', u2.email) as reporter,
        (SELECT COUNT(*) FROM timeline_events WHERE incident_id = i.id) as timeline_events_count,
        (SELECT COUNT(*) FROM action_items WHERE incident_id = i.id) as action_items_count
      FROM incidents i
      LEFT JOIN users u ON i.incident_lead_id = u.id
      LEFT JOIN users u2 ON i.reporter_id = u2.id
    `;

    const params: any[] = [];
    if (status) {
      query += ' WHERE i.status = $1';
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);
    
    // Transform the result to match expected format
    const incidents = result.rows.map(row => ({
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      createdAt: row.created_at,
      detectedAt: row.detected_at,
      mitigatedAt: row.mitigated_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      problemStatement: row.problem_statement,
      impact: row.impact,
      causes: row.causes,
      stepsToResolve: row.steps_to_resolve,
      _count: {
        timelineEvents: parseInt(row.timeline_events_count),
        actionItems: parseInt(row.action_items_count),
      },
      incidentLead: row.incident_lead,
      reporter: row.reporter,
    }));

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}
