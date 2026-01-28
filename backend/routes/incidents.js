const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/incidents - List all incidents
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

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

    const params = [];
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

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// POST /api/incidents - Create new incident
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { incidentNumber, title, description, severity, incidentLead } = req.body;

    // Validate required fields
    if (!incidentNumber || !title || !description || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
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
        incident_lead_id, reporter_id, detected_at, impact, problem_statement
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
      RETURNING *`,
      [incidentNumber, title, description, severity, 'active', user.id, user.id, 'Unknown', description]
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

    res.status(201).json(completeIncident.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating incident:', error);
    
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(409).json({ error: 'An incident with this number already exists' });
    }

    res.status(500).json({ error: 'Failed to create incident' });
  } finally {
    client.release();
  }
});

// GET /api/incidents/:id - Get single incident
router.get('/:id', async (req, res) => {
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
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
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

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// PATCH /api/incidents/:id - Update incident
router.patch('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      status,
      problemStatement,
      impact,
      causes,
      stepsToResolve,
      title,
      description,
      severity,
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
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

    values.push(req.params.id);

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
          [req.params.id, 'status_change', `Status changed to ${status}`, userResult.rows[0].id, JSON.stringify({ newStatus: status })]
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

    res.json(transformed);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  } finally {
    client.release();
  }
});

// DELETE /api/incidents/:id - Delete incident
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

// Timeline routes
router.get('/:id/timeline', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) as user
       FROM timeline_events te
       LEFT JOIN users u ON te.user_id = u.id
       WHERE te.incident_id = $1
       ORDER BY te.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    res.status(500).json({ error: 'Failed to fetch timeline events' });
  }
});

router.post('/:id/timeline', async (req, res) => {
  try {
    const { description, eventType = 'update', metadata = {} } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Get or create default user
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['manager@example.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await pool.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['manager@example.com', 'Manager on Duty']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create timeline event
    const result = await pool.query(
      `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, eventType, description, user.id, JSON.stringify(metadata)]
    );

    const timelineEvent = {
      ...result.rows[0],
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

    res.status(201).json(timelineEvent);
  } catch (error) {
    console.error('Error creating timeline event:', error);
    res.status(500).json({ error: 'Failed to create timeline event' });
  }
});

// Action Items routes
router.get('/:id/actions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ai.*,
        CASE WHEN ai.assigned_to_id IS NOT NULL
          THEN json_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ELSE NULL
        END as assigned_to
       FROM action_items ai
       LEFT JOIN users u ON ai.assigned_to_id = u.id
       WHERE ai.incident_id = $1
       ORDER BY ai.created_at ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

router.post('/:id/actions', async (req, res) => {
  try {
    const { description, assignedToId } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await pool.query(
      `INSERT INTO action_items (incident_id, description, assigned_to_id, completed)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, description, assignedToId || null, false]
    );

    const actionItem = result.rows[0];

    // Fetch assigned user if exists
    if (actionItem.assigned_to_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [actionItem.assigned_to_id]
      );
      actionItem.assignedTo = userResult.rows[0] || null;
    } else {
      actionItem.assignedTo = null;
    }

    res.status(201).json(actionItem);
  } catch (error) {
    console.error('Error creating action item:', error);
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

router.patch('/:id/actions/:actionId', async (req, res) => {
  try {
    const { completed, description, assignedToId } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (completed !== undefined) {
      updates.push(`completed = $${paramCount++}`);
      values.push(completed);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (assignedToId !== undefined) {
      updates.push(`assigned_to_id = $${paramCount++}`);
      values.push(assignedToId);
    }

    values.push(req.params.actionId);

    const result = await pool.query(
      `UPDATE action_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const actionItem = result.rows[0];

    // Fetch assigned user if exists
    if (actionItem.assigned_to_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [actionItem.assigned_to_id]
      );
      actionItem.assignedTo = userResult.rows[0] || null;
    } else {
      actionItem.assignedTo = null;
    }

    res.json(actionItem);
  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

router.delete('/:id/actions/:actionId', async (req, res) => {
  try {
    await pool.query('DELETE FROM action_items WHERE id = $1', [req.params.actionId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting action item:', error);
    res.status(500).json({ error: 'Failed to delete action item' });
  }
});

module.exports = router;
