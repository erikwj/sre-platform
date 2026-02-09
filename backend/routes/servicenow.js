const express = require('express');
const router = express.Router();
const pool = require('../db');
const serviceNowService = require('../services/serviceNowService');

// GET /api/servicenow/status - Check ServiceNow integration status
router.get('/status', (req, res) => {
  res.json({
    enabled: serviceNowService.isEnabled(),
    instanceUrl: process.env.SERVICENOW_INSTANCE_URL || null,
  });
});

// POST /api/servicenow/sync/:id - Sync a single incident to ServiceNow
router.post('/sync/:id', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    // Fetch incident from database
    const result = await pool.query(
      `SELECT i.*,
        json_build_object('id', u1.id, 'name', u1.name, 'email', u1.email) as incident_lead,
        json_build_object('id', u2.id, 'name', u2.name, 'email', u2.email) as reporter
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
    
    // Transform to match expected format
    const incidentData = {
      incidentNumber: incident.incident_number,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      problemStatement: incident.problem_statement,
      stepsToResolve: incident.steps_to_resolve,
      incidentLead: incident.incident_lead,
      reporter: incident.reporter,
    };

    const snowIncident = await serviceNowService.syncIncident(incidentData);
    
    // Store ServiceNow sys_id in database
    await pool.query(
      'UPDATE incidents SET snow_sys_id = $1, snow_number = $2 WHERE id = $3',
      [snowIncident.sys_id, snowIncident.number, req.params.id]
    );

    res.json({
      success: true,
      snowNumber: snowIncident.number,
      snowSysId: snowIncident.sys_id,
      snowUrl: `${process.env.SERVICENOW_INSTANCE_URL}/nav_to.do?uri=incident.do?sys_id=${snowIncident.sys_id}`,
    });
  } catch (error) {
    console.error('Error syncing incident to ServiceNow:', error);
    res.status(500).json({ 
      error: 'Failed to sync incident to ServiceNow',
      details: error.message 
    });
  }
});

// POST /api/servicenow/sync-all - Sync all incidents to ServiceNow
router.post('/sync-all', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    // Fetch all incidents
    const result = await pool.query(
      `SELECT i.*,
        json_build_object('id', u1.id, 'name', u1.name, 'email', u1.email) as incident_lead,
        json_build_object('id', u2.id, 'name', u2.name, 'email', u2.email) as reporter
       FROM incidents i
       LEFT JOIN users u1 ON i.incident_lead_id = u1.id
       LEFT JOIN users u2 ON i.reporter_id = u2.id
       ORDER BY i.created_at DESC`
    );

    const incidents = result.rows.map(row => ({
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      problemStatement: row.problem_statement,
      stepsToResolve: row.steps_to_resolve,
      incidentLead: row.incident_lead,
      reporter: row.reporter,
    }));

    const syncResults = await serviceNowService.bulkSyncIncidents(incidents);

    // Update database with ServiceNow IDs for successful syncs
    for (const success of syncResults.success) {
      await pool.query(
        'UPDATE incidents SET snow_sys_id = $1, snow_number = $2 WHERE incident_number = $3',
        [success.snowSysId, success.snowNumber, success.incidentNumber]
      );
    }

    res.json({
      total: incidents.length,
      synced: syncResults.success.length,
      failed: syncResults.failed.length,
      results: syncResults,
    });
  } catch (error) {
    console.error('Error syncing incidents to ServiceNow:', error);
    res.status(500).json({ 
      error: 'Failed to sync incidents to ServiceNow',
      details: error.message 
    });
  }
});

// GET /api/servicenow/incidents - Get incidents from ServiceNow
router.get('/incidents', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const { state, limit, offset } = req.query;
    
    const incidents = await serviceNowService.getIncidents({
      state,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
    });

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching ServiceNow incidents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incidents from ServiceNow',
      details: error.message 
    });
  }
});

// GET /api/servicenow/incidents/:sysId - Get a specific incident from ServiceNow
router.get('/incidents/:sysId', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const incident = await serviceNowService.getIncident(req.params.sysId);
    res.json(incident);
  } catch (error) {
    console.error('Error fetching ServiceNow incident:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incident from ServiceNow',
      details: error.message 
    });
  }
});

// GET /api/servicenow/incident-by-number/:number - Get incident details by incident number
router.get('/incident-by-number/:number', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const incident = await serviceNowService.findByNumber(req.params.number);
    
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found in ServiceNow' });
    }

    // Return only the fields needed for the form
    res.json({
      number: incident.number,
      short_description: incident.short_description,
      description: incident.description,
      sys_id: incident.sys_id,
    });
  } catch (error) {
    console.error('Error fetching ServiceNow incident by number:', error);
    res.status(500).json({ 
      error: 'Failed to fetch incident from ServiceNow',
      details: error.message 
    });
  }
});

// POST /api/servicenow/import - Import incidents from ServiceNow to local DB
router.post('/import', async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const { state, limit } = req.body;
    
    // Fetch incidents from ServiceNow
    const snowIncidents = await serviceNowService.getIncidents({
      state,
      limit: limit || 100,
    });

    await client.query('BEGIN');

    const imported = [];
    const skipped = [];

    // Get or create default user
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@servicenow.com']
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        ['admin@servicenow.com', 'ServiceNow Admin']
      );
      user = insertUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    for (const snowIncident of snowIncidents) {
      // Check if already imported
      const existing = await client.query(
        'SELECT id FROM incidents WHERE snow_sys_id = $1',
        [snowIncident.sys_id]
      );

      if (existing.rows.length > 0) {
        skipped.push(snowIncident.number);
        continue;
      }

      // Map and insert incident
      const mappedIncident = serviceNowService.mapFromServiceNowIncident(snowIncident);
      
      const result = await client.query(
        `INSERT INTO incidents (
          incident_number, title, description, severity, status,
          incident_lead_id, reporter_id, detected_at, impact,
          problem_statement, steps_to_resolve, resolved_at, closed_at,
          snow_sys_id, snow_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`,
        [
          mappedIncident.incidentNumber,
          mappedIncident.title,
          mappedIncident.description,
          mappedIncident.severity,
          mappedIncident.status,
          user.id,
          user.id,
          mappedIncident.detectedAt || new Date(),
          'Imported from ServiceNow',
          mappedIncident.problemStatement,
          mappedIncident.stepsToResolve,
          mappedIncident.resolvedAt,
          mappedIncident.closedAt,
          mappedIncident.snowSysId,
          mappedIncident.snowNumber,
        ]
      );

      imported.push(mappedIncident.incidentNumber);

      // Create initial timeline event
      await client.query(
        `INSERT INTO timeline_events (incident_id, event_type, description, user_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          result.rows[0].id,
          'imported',
          `Incident imported from ServiceNow: ${mappedIncident.title}`,
          user.id,
          JSON.stringify({ snowNumber: mappedIncident.snowNumber }),
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      total: snowIncidents.length,
      imported: imported.length,
      skipped: skipped.length,
      importedIncidents: imported,
      skippedIncidents: skipped,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing ServiceNow incidents:', error);
    res.status(500).json({ 
      error: 'Failed to import incidents from ServiceNow',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// GET /api/servicenow/groups/:groupName/members - Get members of a specific group
router.get('/groups/:groupName/members', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const members = await serviceNowService.getGroupMembers(req.params.groupName);
    res.json(members);
  } catch (error) {
    console.error('Error fetching ServiceNow group members:', error);
    res.status(500).json({
      error: 'Failed to fetch group members from ServiceNow',
      details: error.message
    });
  }
});

// GET /api/servicenow/assignment-groups - Get assignment groups
router.get('/assignment-groups', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const { limit } = req.query;
    const groups = await serviceNowService.getAssignmentGroups(parseInt(limit) || 50);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching ServiceNow assignment groups:', error);
    res.status(500).json({
      error: 'Failed to fetch assignment groups from ServiceNow',
      details: error.message
    });
  }
});

// GET /api/servicenow/users/search - Search for users
router.get('/users/search', async (req, res) => {
  try {
    if (!serviceNowService.isEnabled()) {
      return res.status(400).json({ error: 'ServiceNow integration is not enabled' });
    }

    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const users = await serviceNowService.searchUsers(q, parseInt(limit) || 10);
    res.json(users);
  } catch (error) {
    console.error('Error searching ServiceNow users:', error);
    res.status(500).json({
      error: 'Failed to search users in ServiceNow',
      details: error.message
    });
  }
});

module.exports = router;
