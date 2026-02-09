'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Plus, Clock, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/app/components/StatusBadge';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { formatRelativeTime, formatDuration } from '@/lib/utils';

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  detectedAt: string;
  resolvedAt?: string;
  incidentLead?: {
    name: string;
  };
  _count: {
    timelineEvents: number;
    actionItems: number;
  };
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; incident: Incident | null }>({
    isOpen: false,
    incident: null,
  });

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const fetchIncidents = async () => {
    try {
      const url = filter === 'all'
        ? '/api/incidents'
        : `/api/incidents?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteIncident = async (incidentId: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete incident');
      // Refresh the list
      fetchIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Failed to delete incident. Please try again.');
    }
  };

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
                  className="text-sm text-text-primary dark:text-white font-medium"
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

      {/* Main Content */}
      <main className="max-w-content mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Incidents</h1>
            <p className="text-text-secondary dark:text-gray-300 mt-1">
              Track and manage all incidents
            </p>
          </div>
          <Link
            href="/incidents/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Declare Incident
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'active', 'investigating', 'mitigated', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === status
                  ? 'bg-status-info text-white'
                  : 'bg-white dark:bg-gray-800 text-text-secondary dark:text-gray-300 border border-border dark:border-gray-700 hover:border-text-secondary dark:hover:border-gray-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-secondary dark:text-gray-300">Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-text-secondary dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
              No incidents found
            </h3>
            <p className="text-text-secondary dark:text-gray-300 mb-6">
              {filter === 'all'
                ? 'Get started by declaring your first incident'
                : `No incidents with status "${filter}"`}
            </p>
            <Link
              href="/incidents/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Declare Incident
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="block bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 hover:border-status-info dark:hover:border-status-info transition-colors"
              >
                <div className="flex items-start justify-between">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-text-secondary dark:text-gray-400">
                        {incident.incidentNumber}
                      </span>
                      <StatusBadge status={incident.status} />
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        {formatRelativeTime(incident.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
                      {incident.title}
                    </h3>
                    <p className="text-sm text-text-secondary dark:text-gray-300 line-clamp-2 mb-3">
                      {incident.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatDuration(
                            new Date(incident.detectedAt),
                            incident.resolvedAt ? new Date(incident.resolvedAt) : undefined
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="capitalize">
                          {incident.severity.replace('_', ' ')}
                        </span>
                      </div>
                      {incident.incidentLead && (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-accent-purple/10 dark:bg-accent-purple/20 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-accent-purple">
                              {incident.incidentLead.name.charAt(0)}
                            </span>
                          </div>
                          <span>{incident.incidentLead.name}</span>
                        </div>
                      )}
                      <span>
                        {incident._count.timelineEvents} updates
                      </span>
                      <span>
                        {incident._count.actionItems} actions
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteModal({ isOpen: true, incident });
                    }}
                    className="ml-4 p-2 text-status-critical hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete incident"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, incident: null })}
          onConfirm={() => {
            if (deleteModal.incident) {
              deleteIncident(deleteModal.incident.id);
            }
          }}
          title="Delete Incident"
          message={
            deleteModal.incident
              ? `Are you sure you want to delete incident ${deleteModal.incident.incidentNumber}? This will permanently remove all associated data including postmortem, timeline events, and action items from the platform. This action cannot be undone.`
              : ''
          }
          confirmText="Delete Incident"
          cancelText="Cancel"
        />
      </main>
    </div>
  );
}
