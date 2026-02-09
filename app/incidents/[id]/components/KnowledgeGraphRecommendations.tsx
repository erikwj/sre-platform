'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, RefreshCw, ExternalLink, TrendingUp, AlertCircle, Sparkles, Clock } from 'lucide-react';

type Recommendation = {
  id?: string;
  referenceIncident: string;
  incidentId?: string;
  incidentNumber: string;
  title?: string;
  severity?: string;
  similarityScore: number;
  recommendation: string;
  details: string;
  actions?: string[];
};

type RecommendationsResponse = {
  available: boolean;
  cached?: boolean;
  message?: string;
  error?: string;
  recommendations: Recommendation[];
};

interface KnowledgeGraphRecommendationsProps {
  incidentId: string;
  incidentStatus: string;
  autoRefreshInterval?: number; // in milliseconds, default 15 minutes
}

export function KnowledgeGraphRecommendations({
  incidentId,
  incidentStatus,
  autoRefreshInterval = 15 * 60 * 1000 // 15 minutes
}: KnowledgeGraphRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = forceRefresh
        ? `/api/incidents/${incidentId}/recommendations/refresh`
        : `/api/incidents/${incidentId}/recommendations`;

      const response = await fetch(url, {
        method: forceRefresh ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data: RecommendationsResponse = await response.json();

      setAvailable(data.available);
      setRecommendations(data.recommendations || []);
      setMessage(data.message || null);
      setError(data.error || null);
      setIsCached(data.cached || false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [incidentId]);

  // Initial load
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Auto-refresh interval (only for active incidents)
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;
    
    // Don't auto-refresh for resolved or closed incidents
    if (incidentStatus === 'resolved' || incidentStatus === 'closed') return;

    const intervalId = setInterval(() => {
      console.log('[Knowledge Graph] Auto-refreshing recommendations...');
      fetchRecommendations(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchRecommendations, incidentStatus]);

  const handleRefresh = () => {
    fetchRecommendations(true);
  };

  const toggleExpanded = (recId: string) => {
    setExpandedRec(expandedRec === recId ? null : recId);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-status-critical bg-status-critical/10';
      case 'high':
        return 'text-status-warning bg-status-warning/10';
      case 'medium':
        return 'text-status-info bg-status-info/10';
      case 'low':
        return 'text-status-resolved bg-status-resolved/10';
      default:
        return 'text-text-secondary bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-status-resolved';
    if (score >= 0.6) return 'text-status-info';
    if (score >= 0.4) return 'text-status-warning';
    return 'text-text-secondary';
  };

  // Don't show recommendations for resolved or closed incidents
  if (incidentStatus === 'resolved' || incidentStatus === 'closed') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-accent-purple/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              AI Knowledge Graph Recommendations
            </h3>
            <p className="text-xs text-text-secondary">
              Analyzing similar past incidents...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-accent-purple animate-spin" />
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              AI Knowledge Graph Recommendations
            </h3>
            <p className="text-xs text-text-secondary">
              {message || 'Service not available'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-status-critical/10 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-status-critical" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary">
              AI Knowledge Graph Recommendations
            </h3>
            <p className="text-xs text-status-critical">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium text-status-info hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-purple/10 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              AI Knowledge Graph Recommendations
            </h3>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              {isCached && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Cached
                </span>
              )}
              {lastUpdated && (
                <span>
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <span>•</span>
              <span>Auto-refresh every 15min</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-status-info hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary">
            No similar incidents found yet. Recommendations will appear as more postmortems are published.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const recId = rec.id || `${rec.referenceIncident}-${idx}`;
            const isExpanded = expandedRec === recId;

            return (
              <div
                key={recId}
                className="border border-border rounded-lg p-4 hover:border-accent-purple/30 transition-colors"
              >
                {/* Recommendation Header */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 bg-accent-purple/10 rounded-full flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-accent-purple" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={`/incidents/${rec.incidentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-status-info hover:text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {rec.incidentNumber || rec.referenceIncident}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {rec.severity && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityColor(rec.severity)}`}>
                          {rec.severity}
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <TrendingUp className={`w-3 h-3 ${getScoreColor(rec.similarityScore)}`} />
                        <span className={`text-xs font-medium ${getScoreColor(rec.similarityScore)}`}>
                          {(rec.similarityScore * 100).toFixed(0)}% match
                        </span>
                      </div>
                    </div>
                    {rec.title && (
                      <p className="text-xs text-text-secondary mb-2 line-clamp-1">
                        {rec.title}
                      </p>
                    )}
                    <p className="text-sm font-medium text-text-primary mb-2">
                      {rec.recommendation}
                    </p>
                    <button
                      onClick={() => toggleExpanded(recId)}
                      className="text-xs text-status-info hover:text-blue-600 font-medium"
                    >
                      {isExpanded ? 'Show less' : 'Show details'}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pl-11 space-y-3">
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">
                        {rec.details}
                      </p>
                    </div>
                    {rec.actions && rec.actions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-primary mb-2">
                          Suggested Actions:
                        </p>
                        <ul className="space-y-1">
                          {rec.actions.map((action, actionIdx) => (
                            <li
                              key={actionIdx}
                              className="text-sm text-text-primary flex items-start gap-2"
                            >
                              <span className="text-accent-purple mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      {recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text-secondary">
            💡 These recommendations are generated by AI based on {recommendations.length} similar past incident{recommendations.length !== 1 ? 's' : ''}.
            They are automatically updated as the incident evolves.
          </p>
        </div>
      )}
    </div>
  );
}
