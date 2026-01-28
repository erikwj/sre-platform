const axios = require('axios');

class ServiceNowService {
  constructor() {
    this.instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
    this.username = process.env.SERVICENOW_USERNAME;
    this.password = process.env.SERVICENOW_PASSWORD;
    
    if (!this.instanceUrl || !this.username || !this.password) {
      console.warn('ServiceNow credentials not configured. ServiceNow integration will be disabled.');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.baseUrl = `${this.instanceUrl}/api/now`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Map internal incident to ServiceNow incident format
   */
  mapToServiceNowIncident(incident, forCreation = false) {
    const severityMap = {
      'critical': '1',
      'high': '2',
      'medium': '3',
      'low': '4',
    };

    const stateMap = {
      'active': '2', // In Progress
      'mitigated': '3', // On Hold
      'resolved': '6', // Resolved
      'closed': '7', // Closed
    };

    const payload = {
      short_description: incident.title || 'Untitled Incident',
      description: incident.description || 'No description provided',
      impact: severityMap[incident.severity] || '3',
      urgency: severityMap[incident.severity] || '3',
      correlation_id: incident.incidentNumber, // Store our incident number for tracking
    };

    // For creation, always create in "In Progress" state to avoid validation issues
    // We'll update to final state afterwards
    if (forCreation) {
      payload.state = '2'; // In Progress
    } else {
      payload.state = stateMap[incident.status] || '2';
      
      // Only include resolution fields when updating to resolved/closed
      if (incident.status === 'resolved' || incident.status === 'closed') {
        payload.close_code = 'Solved (Permanently)';
        if (incident.stepsToResolve) {
          payload.close_notes = incident.stepsToResolve;
        } else {
          payload.close_notes = 'Incident resolved';
        }
      }
    }

    // Add work notes if available
    if (incident.problemStatement) {
      payload.work_notes = incident.problemStatement;
    }

    return payload;
  }

  /**
   * Map ServiceNow incident to internal format
   */
  mapFromServiceNowIncident(snowIncident) {
    const severityMap = {
      '1': 'critical',
      '2': 'high',
      '3': 'medium',
      '4': 'low',
    };

    const stateMap = {
      '1': 'active', // New
      '2': 'active', // In Progress
      '3': 'mitigated', // On Hold
      '6': 'resolved', // Resolved
      '7': 'closed', // Closed
    };

    return {
      incidentNumber: snowIncident.number,
      title: snowIncident.short_description,
      description: snowIncident.description || '',
      severity: severityMap[snowIncident.impact] || 'medium',
      status: stateMap[snowIncident.state] || 'active',
      problemStatement: snowIncident.work_notes || '',
      stepsToResolve: snowIncident.close_notes || '',
      detectedAt: snowIncident.opened_at,
      resolvedAt: snowIncident.resolved_at,
      closedAt: snowIncident.closed_at,
      snowSysId: snowIncident.sys_id,
      snowNumber: snowIncident.number,
    };
  }

  /**
   * Create an incident in ServiceNow
   */
  async createIncident(incident) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      // Create incident in "In Progress" state first
      const snowIncident = this.mapToServiceNowIncident(incident, true);
      const response = await this.client.post('/table/incident', snowIncident);
      const created = response.data.result;
      
      // If original incident was resolved/closed, update it to that state
      if (incident.status === 'resolved' || incident.status === 'closed') {
        return await this.updateIncident(created.sys_id, incident);
      }
      
      return created;
    } catch (error) {
      console.error('Error creating ServiceNow incident:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update an incident in ServiceNow
   */
  async updateIncident(sysId, incident) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const snowIncident = this.mapToServiceNowIncident(incident);
      const response = await this.client.patch(`/table/incident/${sysId}`, snowIncident);
      return response.data.result;
    } catch (error) {
      console.error('Error updating ServiceNow incident:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get an incident from ServiceNow by sys_id
   */
  async getIncident(sysId) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const response = await this.client.get(`/table/incident/${sysId}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching ServiceNow incident:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get incidents from ServiceNow with optional filters
   */
  async getIncidents(query = {}) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const params = {
        sysparm_limit: query.limit || 100,
        sysparm_offset: query.offset || 0,
      };

      if (query.state) {
        params.sysparm_query = `state=${query.state}`;
      }

      const response = await this.client.get('/table/incident', { params });
      return response.data.result;
    } catch (error) {
      console.error('Error fetching ServiceNow incidents:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for an incident by correlation_id (our incident number)
   */
  async findByCorrelationId(correlationId) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const response = await this.client.get('/table/incident', {
        params: {
          sysparm_query: `correlation_id=${correlationId}`,
          sysparm_limit: 1,
        },
      });
      return response.data.result[0] || null;
    } catch (error) {
      console.error('Error searching ServiceNow incident:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for an incident by number (INC-XXXXX)
   */
  async findByNumber(incidentNumber) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const response = await this.client.get('/table/incident', {
        params: {
          sysparm_query: `number=${incidentNumber}`,
          sysparm_limit: 1,
        },
      });
      return response.data.result[0] || null;
    } catch (error) {
      console.error('Error searching ServiceNow incident by number:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sync incident to ServiceNow (create or update)
   */
  async syncIncident(incident) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      // Check if incident already exists in ServiceNow
      const existing = await this.findByCorrelationId(incident.incidentNumber);
      
      if (existing) {
        // Update existing incident
        return await this.updateIncident(existing.sys_id, incident);
      } else {
        // Create new incident
        return await this.createIncident(incident);
      }
    } catch (error) {
      console.error('Error syncing incident to ServiceNow:', error);
      throw error;
    }
  }

  /**
   * Bulk sync incidents to ServiceNow
   */
  async bulkSyncIncidents(incidents) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const incident of incidents) {
      try {
        const result = await this.syncIncident(incident);
        results.success.push({
          incidentNumber: incident.incidentNumber,
          snowNumber: result.number,
          snowSysId: result.sys_id,
        });
      } catch (error) {
        results.failed.push({
          incidentNumber: incident.incidentNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get activity log (journal entries) for an incident
   */
  async getIncidentActivity(sysId) {
    if (!this.enabled) {
      throw new Error('ServiceNow integration is not enabled');
    }

    try {
      const response = await this.client.get('/table/sys_journal_field', {
        params: {
          sysparm_query: `element_id=${sysId}^element=work_notes^ORelement=comments^ORDERBYsys_created_on`,
          sysparm_fields: 'sys_id,element,value,sys_created_by,sys_created_on,name',
          sysparm_display_value: 'true',
        },
      });

      return response.data.result.map(activity => ({
        snowSysId: activity.sys_id,
        activityType: activity.element,
        value: activity.value,
        createdBy: activity.sys_created_by,
        createdAt: activity.sys_created_on,
        incidentNumber: activity.name,
      }));
    } catch (error) {
      console.error('Error fetching ServiceNow activity log:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ServiceNowService();
