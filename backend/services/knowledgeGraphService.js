const { VertexAI } = require('@google-cloud/vertexai');
const pool = require('../db');

/**
 * Knowledge Graph Service for Postmortem Recommendations
 * Uses Vertex AI for embeddings and vector similarity search
 */
class KnowledgeGraphService {
  constructor() {
    this.vertexAI = null;
    this.projectId = null;
    this.location = null;
    this.embeddingModel = 'text-embedding-004'; // Latest Gemini embedding model
    this.initialized = false;
  }

  /**
   * Initialize the service with GCP credentials
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Check for service account key file
      const fs = require('fs');
      const path = require('path');
      
      const serviceAccountPaths = [
        path.join(__dirname, '../../google-service-account-key.json'),
        '/app/google-service-account-key.json'
      ];
      
      const serviceAccountPath = serviceAccountPaths.find(p => fs.existsSync(p));
      
      if (!serviceAccountPath) {
        console.warn('[Knowledge Graph] No GCP service account found. Knowledge graph features disabled.');
        return;
      }

      // Read service account
      const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      this.projectId = serviceAccountKey.project_id;
      this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

      // Set credentials
      process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;

      // Initialize Vertex AI
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location,
      });

      this.initialized = true;
      console.log('[Knowledge Graph] Initialized successfully:', {
        project: this.projectId,
        location: this.location,
      });
    } catch (error) {
      console.error('[Knowledge Graph] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.initialized && this.vertexAI !== null;
  }

  /**
   * Extract key information from postmortem for embedding
   */
  extractPostmortemText(postmortem, incident) {
    const parts = [];

    // Incident metadata
    parts.push(`Incident: ${incident.incident_number} - ${incident.title}`);
    parts.push(`Severity: ${incident.severity}`);
    
    if (incident.description) {
      parts.push(`Description: ${incident.description}`);
    }

    // Business impact
    if (postmortem.business_impact_description) {
      parts.push(`Impact: ${postmortem.business_impact_description}`);
    }

    // Symptoms and detection
    if (incident.problem_statement) {
      parts.push(`Problem: ${incident.problem_statement}`);
    }

    // Root cause and resolution
    if (incident.causes) {
      parts.push(`Causes: ${incident.causes}`);
    }

    if (postmortem.mitigation_description) {
      parts.push(`Resolution: ${postmortem.mitigation_description}`);
    }

    // Causal analysis
    if (postmortem.causal_analysis) {
      const causalAnalysis = typeof postmortem.causal_analysis === 'string' 
        ? JSON.parse(postmortem.causal_analysis) 
        : postmortem.causal_analysis;
      
      if (Array.isArray(causalAnalysis)) {
        causalAnalysis.forEach(item => {
          parts.push(`Root Cause (${item.interceptionLayer}): ${item.cause} - ${item.description}`);
        });
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Generate embedding for text using Vertex AI
   */
  async generateEmbedding(text) {
    if (!this.isAvailable()) {
      throw new Error('Knowledge Graph service not initialized');
    }

    try {
      // Use the REST API directly for embeddings
      return await this.generateEmbeddingAlternative(text);
    } catch (error) {
      console.error('[Knowledge Graph] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Alternative embedding generation using text-embedding endpoint
   */
  async generateEmbeddingAlternative(text) {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${this.location}/publishers/google/models/${this.embeddingModel}:predict`;

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        instances: [{ content: text }],
      },
    });

    return response.data.predictions[0].embeddings.values;
  }

  /**
   * Store postmortem embedding in database
   */
  async storePostmortemEmbedding(postmortemId, incidentId, embeddingVector, embeddingText, metadata = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO postmortem_embeddings 
         (postmortem_id, incident_id, embedding_vector, embedding_text, metadata, embedding_version)
         VALUES ($1, $2, $3, $4, $5, 1)
         ON CONFLICT (postmortem_id) 
         DO UPDATE SET 
           embedding_vector = EXCLUDED.embedding_vector,
           embedding_text = EXCLUDED.embedding_text,
           metadata = EXCLUDED.metadata,
           embedding_version = postmortem_embeddings.embedding_version + 1,
           created_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [postmortemId, incidentId, JSON.stringify(embeddingVector), embeddingText, JSON.stringify(metadata)]
      );

      console.log('[Knowledge Graph] Stored embedding for postmortem:', postmortemId);
      return result.rows[0].id;
    } catch (error) {
      console.error('[Knowledge Graph] Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find similar postmortems using vector similarity search
   */
  async findSimilarPostmortems(incidentId, queryEmbedding, topN = 5) {
    try {
      // Get all postmortem embeddings (excluding the current incident)
      const result = await pool.query(
        `SELECT 
          pe.id,
          pe.postmortem_id,
          pe.incident_id,
          pe.embedding_vector,
          pe.embedding_text,
          pe.metadata,
          i.incident_number,
          i.title,
          i.severity,
          i.status,
          i.detected_at,
          i.resolved_at,
          p.business_impact_description,
          p.mitigation_description,
          p.published_at
         FROM postmortem_embeddings pe
         JOIN incidents i ON pe.incident_id = i.id
         JOIN postmortems p ON pe.postmortem_id = p.id
         WHERE pe.incident_id != $1 
           AND p.status = 'published'
         ORDER BY pe.created_at DESC`,
        [incidentId]
      );

      if (result.rows.length === 0) {
        return [];
      }

      // Calculate similarity scores
      const similarities = result.rows.map(row => {
        const storedVector = row.embedding_vector;
        const similarity = this.cosineSimilarity(queryEmbedding, storedVector);

        return {
          embeddingId: row.id,
          postmortemId: row.postmortem_id,
          incidentId: row.incident_id,
          incidentNumber: row.incident_number,
          title: row.title,
          severity: row.severity,
          status: row.status,
          detectedAt: row.detected_at,
          resolvedAt: row.resolved_at,
          businessImpact: row.business_impact_description,
          mitigation: row.mitigation_description,
          publishedAt: row.published_at,
          similarityScore: similarity,
          embeddingText: row.embedding_text,
          metadata: row.metadata,
        };
      });

      // Sort by similarity score and return top N
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);
      return similarities.slice(0, topN);
    } catch (error) {
      console.error('[Knowledge Graph] Error finding similar postmortems:', error);
      throw error;
    }
  }

  /**
   * Generate AI recommendations based on similar incidents
   */
  async generateRecommendations(currentIncident, similarIncidents) {
    if (!this.isAvailable()) {
      throw new Error('Knowledge Graph service not initialized');
    }

    try {
      const model = this.vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });

      const prompt = `You are an expert SRE analyzing incident patterns. Based on similar past incidents, provide actionable recommendations for the current incident.

**Current Incident:**
- Number: ${currentIncident.incident_number}
- Title: ${currentIncident.title}
- Description: ${currentIncident.description || 'N/A'}
- Severity: ${currentIncident.severity}
- Problem: ${currentIncident.problem_statement || 'Under investigation'}

**Similar Past Incidents:**
${similarIncidents.map((inc, idx) => `
${idx + 1}. ${inc.incidentNumber} - ${inc.title} (Similarity: ${(inc.similarityScore * 100).toFixed(1)}%)
   - Severity: ${inc.severity}
   - Impact: ${inc.businessImpact?.substring(0, 200) || 'N/A'}...
   - Resolution: ${inc.mitigation?.substring(0, 200) || 'N/A'}...
`).join('\n')}

Generate 3-5 specific, actionable recommendations for investigating and resolving the current incident. For each recommendation:
1. Reference the similar incident number
2. Explain what was learned from that incident
3. Provide specific actions to try

Format as JSON array:
[
  {
    "referenceIncident": "INC-XXXX",
    "similarityScore": 0.XX,
    "recommendation": "Brief recommendation title",
    "details": "Detailed explanation of what to try and why",
    "actions": ["Specific action 1", "Specific action 2"]
  }
]

Return ONLY the JSON array, no other text.`;

      const result = await model.generateContent(prompt);
      const text = result.response.candidates[0].content.parts[0].text;

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('[Knowledge Graph] Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Process postmortem when published - generate and store embeddings
   */
  async processPublishedPostmortem(postmortemId) {
    if (!this.isAvailable()) {
      console.warn('[Knowledge Graph] Service not available, skipping embedding generation');
      return null;
    }

    try {
      // Fetch postmortem and incident data
      const result = await pool.query(
        `SELECT 
          p.*,
          i.id as incident_id,
          i.incident_number,
          i.title,
          i.description,
          i.severity,
          i.problem_statement,
          i.causes,
          i.impact
         FROM postmortems p
         JOIN incidents i ON p.incident_id = i.id
         WHERE p.id = $1`,
        [postmortemId]
      );

      if (result.rows.length === 0) {
        throw new Error('Postmortem not found');
      }

      const postmortem = result.rows[0];
      const incident = {
        incident_number: postmortem.incident_number,
        title: postmortem.title,
        description: postmortem.description,
        severity: postmortem.severity,
        problem_statement: postmortem.problem_statement,
        causes: postmortem.causes,
        impact: postmortem.impact,
      };

      // Extract text for embedding
      const embeddingText = this.extractPostmortemText(postmortem, incident);

      console.log('[Knowledge Graph] Generating embedding for postmortem:', postmortemId);
      console.log('[Knowledge Graph] Text length:', embeddingText.length, 'characters');

      // Generate embedding
      const embedding = await this.generateEmbedding(embeddingText);

      // Store embedding
      const metadata = {
        incidentNumber: incident.incident_number,
        severity: incident.severity,
        processedAt: new Date().toISOString(),
      };

      await this.storePostmortemEmbedding(
        postmortemId,
        postmortem.incident_id,
        embedding,
        embeddingText,
        metadata
      );

      console.log('[Knowledge Graph] Successfully processed postmortem:', postmortemId);
      return { success: true, embeddingId: postmortemId };
    } catch (error) {
      console.error('[Knowledge Graph] Error processing postmortem:', error);
      throw error;
    }
  }

  /**
   * Get recommendations for an incident
   */
  async getIncidentRecommendations(incidentId, forceRefresh = false) {
    if (!this.isAvailable()) {
      return { available: false, recommendations: [] };
    }

    try {
      // Check for cached recommendations (if not forcing refresh)
      if (!forceRefresh) {
        const cached = await pool.query(
          `SELECT 
            ir.*,
            i.incident_number,
            i.title,
            i.severity,
            p.business_impact_description,
            p.mitigation_description
           FROM incident_recommendations ir
           JOIN incidents i ON ir.recommended_incident_id = i.id
           LEFT JOIN postmortems p ON i.id = p.incident_id
           WHERE ir.incident_id = $1
             AND ir.updated_at > NOW() - INTERVAL '15 minutes'
           ORDER BY ir.similarity_score DESC`,
          [incidentId]
        );

        if (cached.rows.length > 0) {
          console.log('[Knowledge Graph] Returning cached recommendations for incident:', incidentId);
          return {
            available: true,
            cached: true,
            recommendations: cached.rows.map(row => {
              const recData = typeof row.recommendation_text === 'string' 
                ? JSON.parse(row.recommendation_text) 
                : row.recommendation_text;
              
              return {
                id: row.id,
                incidentId: row.recommended_incident_id,
                incidentNumber: row.incident_number,
                title: row.title,
                severity: row.severity,
                similarityScore: parseFloat(row.similarity_score),
                ...recData, // Spread the full recommendation data (includes details, actions, etc.)
              };
            }),
          };
        }
      }

      // Fetch current incident
      const incidentResult = await pool.query(
        `SELECT * FROM incidents WHERE id = $1`,
        [incidentId]
      );

      if (incidentResult.rows.length === 0) {
        throw new Error('Incident not found');
      }

      const incident = incidentResult.rows[0];

      // Create embedding text from current incident state
      const embeddingText = this.extractPostmortemText(
        {
          business_impact_description: incident.impact,
          mitigation_description: incident.steps_to_resolve,
          causal_analysis: null,
        },
        incident
      );

      console.log('[Knowledge Graph] Generating embedding for incident:', incidentId);
      const queryEmbedding = await this.generateEmbedding(embeddingText);

      // Find similar postmortems
      const similarIncidents = await this.findSimilarPostmortems(incidentId, queryEmbedding, 5);

      if (similarIncidents.length === 0) {
        return { available: true, recommendations: [] };
      }

      // Generate AI recommendations
      const aiRecommendations = await this.generateRecommendations(incident, similarIncidents);

      // Store recommendations in cache (using upsert to handle duplicates)
      await pool.query('DELETE FROM incident_recommendations WHERE incident_id = $1', [incidentId]);

      for (const rec of aiRecommendations) {
        const similarIncident = similarIncidents.find(
          inc => inc.incidentNumber === rec.referenceIncident
        );

        if (similarIncident) {
          await pool.query(
            `INSERT INTO incident_recommendations 
             (incident_id, recommended_incident_id, similarity_score, recommendation_text, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (incident_id, recommended_incident_id) 
             DO UPDATE SET 
               similarity_score = EXCLUDED.similarity_score,
               recommendation_text = EXCLUDED.recommendation_text,
               metadata = EXCLUDED.metadata,
               updated_at = CURRENT_TIMESTAMP`,
            [
              incidentId,
              similarIncident.incidentId,
              rec.similarityScore || similarIncident.similarityScore,
              JSON.stringify(rec),
              JSON.stringify({ generatedAt: new Date().toISOString() }),
            ]
          );
        }
      }

      console.log('[Knowledge Graph] Generated and cached recommendations for incident:', incidentId);

      return {
        available: true,
        cached: false,
        recommendations: aiRecommendations.map(rec => {
          const similarIncident = similarIncidents.find(
            inc => inc.incidentNumber === rec.referenceIncident
          );
          return {
            ...rec,
            incidentId: similarIncident?.incidentId,
            incidentNumber: rec.referenceIncident,
            title: similarIncident?.title,
            severity: similarIncident?.severity,
            similarityScore: rec.similarityScore || similarIncident?.similarityScore,
          };
        }),
      };
    } catch (error) {
      console.error('[Knowledge Graph] Error getting recommendations:', error);
      return { available: true, error: error.message, recommendations: [] };
    }
  }
}

// Export singleton instance
let knowledgeGraphInstance = null;

function getKnowledgeGraphService() {
  if (!knowledgeGraphInstance) {
    knowledgeGraphInstance = new KnowledgeGraphService();
    // Initialize asynchronously
    knowledgeGraphInstance.initialize().catch(err => {
      console.error('[Knowledge Graph] Failed to initialize:', err);
    });
  }
  return knowledgeGraphInstance;
}

module.exports = {
  getKnowledgeGraphService,
  KnowledgeGraphService,
};
