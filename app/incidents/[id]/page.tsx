'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Clock, Users, Link2, Tag, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/app/components/StatusBadge';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { OverviewTab } from './components/OverviewTab';
import { InvestigationTab } from './components/InvestigationTab';
import { PostmortemTab } from './components/PostmortemTab';

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  detectedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  problemStatement?: string;
  impact?: string;
  causes?: string;
  stepsToResolve?: string;
  snowSysId?: string;
  snowNumber?: string;
  incidentLead?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  timelineEvents: any[];
  actionItems: any[];
  services: any[];
};

type Tab = 'overview' | 'investigation' | 'postmortem';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync ServiceNow activities every 30 seconds
  useEffect(() => {
    if (!incident?.id || !incident.snowSysId) return;

    const syncActivities = async () => {
      if (isSyncing) return;
      
      setIsSyncing(true);
      try {
        const response = await fetch(`/api/incidents/${incident.id}/sync-snow-activities`, {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          // If new activities were synced, refresh the incident data
          if (data.synced > 0) {
            fetchIncident();
          }
        }
      } catch (error) {
        console.error('Error syncing SNOW activities:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Initial sync
    syncActivities();

    // Set up interval for periodic sync
    const interval = setInterval(syncActivities, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [incident?.id, incident?.snowSysId]);

  useEffect(() => {
    fetchIncident();
  }, [params.id]);

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch incident');
      }
      const data = await response.json();
      setIncident(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateIncident = async (updates: Partial<Incident>) => {
    try {
      console.log('[DEBUG] updateIncident called with:', updates);
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update incident');
      const updated = await response.json();
      console.log('[DEBUG] updateIncident response:', updated);
      setIncident((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Error updating incident:', err);
    }
  };

  const deleteIncident = async () => {
    try {
      const response = await fetch(`/api/incidents/${params.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete incident');
      router.push('/incidents');
    } catch (err) {
      console.error('Error deleting incident:', err);
      alert('Failed to delete incident. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900">
        <nav className="border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-content mx-auto px-8 py-4">
            <Link href="/" className="text-xl font-bold text-text-primary dark:text-white">
              SRE Platform
            </Link>
          </div>
        </nav>
        <div className="max-w-content mx-auto px-8 py-12">
          <div className="text-center text-text-secondary dark:text-gray-400">Loading incident...</div>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-900">
        <nav className="border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-content mx-auto px-8 py-4">
            <Link href="/" className="text-xl font-bold text-text-primary dark:text-white">
              SRE Platform
            </Link>
          </div>
        </nav>
        <div className="max-w-content mx-auto px-8 py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-status-critical mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-2">
              Incident Not Found
            </h2>
            <p className="text-text-secondary dark:text-gray-400 mb-6">{error || 'The incident could not be loaded.'}</p>
            <Link
              href="/incidents"
              className="inline-block px-4 py-2 bg-status-info text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View All Incidents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-content mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-text-primary dark:text-white">
                SRE Platform
              </Link>
              <div className="flex space-x-6">
                <Link
                  href="/incidents"
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Incidents
                </Link>
                <Link
                  href="/postmortems"
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Postmortems
                </Link>
                <Link
                  href="/runbooks"
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Runbooks
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Declare Major Incident
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="max-w-content mx-auto px-8 py-3">
          <div className="flex items-center text-sm text-text-secondary dark:text-gray-400">
            <Link href="/incidents" className="hover:text-text-primary dark:hover:text-white">
              Incidents
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-text-primary dark:text-white font-medium">{incident.incidentNumber}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="max-w-content mx-auto px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-text-secondary dark:text-gray-400">
                  {incident.incidentNumber}
                </span>
                <StatusBadge status={incident.status} />
              </div>
              <h1 className="text-3xl font-bold text-text-primary dark:text-white">{incident.title}</h1>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-status-critical text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Incident
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-status-info text-status-info'
                  : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('investigation')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'investigation'
                  ? 'border-status-info text-status-info'
                  : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
              }`}
            >
              Investigation
            </button>
            <button
              onClick={() => setActiveTab('postmortem')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'postmortem'
                  ? 'border-status-info text-status-info'
                  : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
              }`}
            >
              Post-mortem
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-content mx-auto px-8 py-8">
        <div className="flex gap-8">
          {/* Left Column - Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <OverviewTab incident={incident} onUpdate={updateIncident} onRefresh={fetchIncident} />
            )}
            {activeTab === 'investigation' && (
              <InvestigationTab incident={incident} onRefresh={fetchIncident} />
            )}
            {activeTab === 'postmortem' && (
              <PostmortemTab incident={incident} onRefresh={fetchIncident} />
            )}
          </div>

          {/* Right Sidebar - Metadata */}
          <div className="w-80 space-y-6">
            {/* Status */}
            <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Status</h3>
              <select
                value={incident.status}
                onChange={(e) => updateIncident({ status: e.target.value })}
                className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="investigating">Investigating</option>
                <option value="mitigated">Mitigated</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Severity */}
            <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Severity</h3>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-status-critical" />
                <span className="text-sm font-medium text-text-primary dark:text-white capitalize">
                  {incident.severity.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Duration</h3>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-text-secondary dark:text-gray-400" />
                <span className="text-sm text-text-primary dark:text-white">
                  {formatDuration(new Date(incident.detectedAt), incident.resolvedAt ? new Date(incident.resolvedAt) : undefined)}
                </span>
              </div>
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-2">
                Started {formatRelativeTime(incident.detectedAt)}
              </p>
            </div>

            {/* Roles */}
            <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Roles</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Incident Lead</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-accent-purple/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-accent-purple">
                        {incident.incidentLead?.name.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-text-primary dark:text-white">
                      {incident.incidentLead?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Reporter</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-status-info/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-status-info">
                        {incident.reporter?.name.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-text-primary dark:text-white">
                      {incident.reporter?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Custom Fields</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Services Affected</p>
                  <div className="flex flex-wrap gap-1">
                    {incident.services.length > 0 ? (
                      incident.services.map((s: any) => (
                        <span
                          key={s.runbook.id}
                          className="inline-flex items-center px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-xs"
                        >
                          {s.runbook.serviceName}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-secondary dark:text-gray-400 text-xs">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Customer Affected?</p>
                  <p className="text-text-primary dark:text-white">Unknown</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">Escalated to Core Team?</p>
                  <p className="text-text-primary dark:text-white">No</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteIncident}
        title="Delete Incident"
        message={`Are you sure you want to delete incident ${incident.incidentNumber}? This will permanently remove all associated data including postmortem, timeline events, and action items from the platform. This action cannot be undone.`}
        confirmText="Delete Incident"
        cancelText="Cancel"
      />
    </div>
  );
}
