'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, Edit, Eye, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { formatRelativeTime } from '@/lib/utils';

type Postmortem = {
  id: string;
  incidentId: string;
  incidentNumber: string;
  incidentTitle: string;
  incidentSeverity: string;
  incidentStatus: string;
  status: string;
  businessImpactApplication?: string;
  businessImpactDescription?: string;
  businessImpactDuration?: number;
  causalAnalysis?: any[];
  actionItems?: any[];
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export default function PostmortemsPage() {
  const [postmortems, setPostmortems] = useState<Postmortem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchPostmortems();
  }, [filter]);

  const fetchPostmortems = async () => {
    try {
      const url = filter === 'all'
        ? 'http://localhost:3001/api/postmortems'
        : `http://localhost:3001/api/postmortems?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPostmortems(data);
      }
    } catch (error) {
      console.error('Failed to fetch postmortems:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4" />;
      case 'draft':
        return <Edit className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                SRE Platform
              </Link>
              <div className="flex space-x-6">
                <Link
                  href="/incidents"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Incidents
                </Link>
                <Link
                  href="/postmortems"
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Postmortems
                </Link>
                <Link
                  href="/runbooks"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Runbooks
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Declare Major Incident
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Postmortems</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Review and analyze incident postmortems
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <div className="flex space-x-2">
              {['all', 'draft', 'published'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">Loading postmortems...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && postmortems.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2">No postmortems found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter !== 'all'
                ? `No ${filter} postmortems available`
                : 'Create your first postmortem from an incident'}
            </p>
          </div>
        )}

        {/* Postmortems List */}
        {!loading && postmortems.length > 0 && (
          <div className="space-y-4">
            {postmortems.map((postmortem) => (
              <Link
                key={postmortem.id}
                href={`/incidents/${postmortem.incidentId}`}
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {postmortem.incidentNumber}
                      </span>
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium border rounded-full ${getSeverityColor(
                          postmortem.incidentSeverity
                        )}`}
                      >
                        <span>{postmortem.incidentSeverity}</span>
                      </span>
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium border rounded-full ${getStatusColor(
                          postmortem.status
                        )}`}
                      >
                        {getStatusIcon(postmortem.status)}
                        <span>{postmortem.status}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {postmortem.incidentTitle}
                    </h3>

                    {/* Business Impact */}
                    {postmortem.businessImpactDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {postmortem.businessImpactDescription}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                      {postmortem.businessImpactApplication && (
                        <div className="flex items-center space-x-1">
                          <FileText className="w-4 h-4" />
                          <span>{postmortem.businessImpactApplication}</span>
                        </div>
                      )}
                      {postmortem.businessImpactDuration !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            Impact: {formatDuration(postmortem.businessImpactDuration)}
                          </span>
                        </div>
                      )}
                      {postmortem.causalAnalysis && postmortem.causalAnalysis.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span>{postmortem.causalAnalysis.length} causal factors</span>
                        </div>
                      )}
                      {postmortem.actionItems && postmortem.actionItems.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span>{postmortem.actionItems.length} action items</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Info */}
                  <div className="ml-6 text-right">
                    {postmortem.publishedAt && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Published</span>
                        <br />
                        <span>{formatRelativeTime(postmortem.publishedAt)}</span>
                      </div>
                    )}
                    {!postmortem.publishedAt && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Updated</span>
                        <br />
                        <span>{formatRelativeTime(postmortem.updatedAt)}</span>
                      </div>
                    )}
                    {postmortem.createdBy && (
                      <div className="text-xs text-gray-500">
                        by {postmortem.createdBy.name}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {!loading && postmortems.length > 0 && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total postmortems: {postmortems.length}</span>
              <span>
                Published:{' '}
                {postmortems.filter((p) => p.status === 'published').length}
              </span>
              <span>
                Draft: {postmortems.filter((p) => p.status === 'draft').length}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
