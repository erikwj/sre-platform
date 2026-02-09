const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/postmortems - List all postmortems
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        p.*,
        i.incident_number,
        i.title as incident_title,
        i.severity as incident_severity,
        i.status as incident_status,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      INNER JOIN incidents i ON p.incident_id = i.id
      LEFT JOIN users u ON p.created_by_id = u.id
    `;

    const queryParams = [];

    // Filter by status if provided
    if (status && status !== 'all') {
      query += ' WHERE p.status = $1';
      queryParams.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, queryParams);

    const postmortems = result.rows.map(row => ({
      id: row.id,
      incidentId: row.incident_id,
      incidentNumber: row.incident_number,
      incidentTitle: row.incident_title,
      incidentSeverity: row.incident_severity,
      incidentStatus: row.incident_status,
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
    }));

    res.json(postmortems);
  } catch (error) {
    console.error('Error fetching postmortems:', error);
    res.status(500).json({ error: 'Failed to fetch postmortems' });
  }
});

// GET /api/postmortems/:id - Get a specific postmortem by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        i.incident_number,
        i.title as incident_title,
        i.severity as incident_severity,
        i.status as incident_status,
        u.name as creator_name,
        u.email as creator_email
      FROM postmortems p
      INNER JOIN incidents i ON p.incident_id = i.id
      LEFT JOIN users u ON p.created_by_id = u.id
      WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Postmortem not found' });
    }

    const row = result.rows[0];
    const postmortem = {
      id: row.id,
      incidentId: row.incident_id,
      incidentNumber: row.incident_number,
      incidentTitle: row.incident_title,
      incidentSeverity: row.incident_severity,
      incidentStatus: row.incident_status,
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

module.exports = router;
