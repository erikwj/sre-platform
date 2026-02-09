'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Users,
  Mail,
  Activity,
  AlertCircle,
  Clock
} from "lucide-react";

interface MonitoringLink {
  name: string;
  url: string;
}

interface RelatedIncident {
  id: string;
  incidentNumber: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
}

interface Runbook {
  id: string;
  serviceName: string;
  teamName: string;
  teamEmail: string;
  description: string;
  monitoringLinks: MonitoringLink[] | null;
  upstreamServices: string[] | null;
  downstreamServices: string[] | null;
  runbookProcedures: string | null;
  createdAt: string;
  updatedAt: string;
  relatedIncidents: RelatedIncident[];
}

export default function RunbookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [runbook, setRunbook] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchRunbook(params.id as string);
    }
  }, [params.id]);

  const fetchRunbook = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/runbooks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRunbook(data);
      } else {
        console.error('Failed to fetch runbook');
      }
    } catch (error) {
      console.error('Error fetching runbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'major':
        return 'bg-orange-100 text-orange-800';
      case 'minor':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'mitigated':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Postmortems
                  </Link>
                  <Link 
                    href="/runbooks" 
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Runbooks
                  </Link>
                </div>
              </div>
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Declare Major Incident
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-8 py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading runbook...</p>
        </main>
      </div>
    );
  }

  if (!runbook) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Postmortems
                  </Link>
                  <Link 
                    href="/runbooks" 
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    Runbooks
                  </Link>
                </div>
              </div>
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Declare Major Incident
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-8 py-8">
          <p className="text-gray-600 dark:text-gray-400">Runbook not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Postmortems
                </Link>
                <Link 
                  href="/runbooks" 
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Runbooks
                </Link>
              </div>
            </div>
            <Link
              href="/incidents/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              Declare Major Incident
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link 
            href="/runbooks"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Runbooks
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {runbook.serviceName}
              </h1>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-medium text-sm">
                  {runbook.teamName}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated {formatDate(runbook.updatedAt)}
                </span>
              </div>
            </div>
            <Link
              href={`/runbooks/${runbook.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Overview</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{runbook.description}</p>
            </div>

            {/* Runbook Procedures */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Runbook Procedures</h2>
              {runbook.runbookProcedures ? (
                <div className="prose prose-sm max-w-none bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <ReactMarkdown
                    components={{
                      h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 first:mt-0" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 mb-3" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                      code: ({node, inline, ...props}: any) =>
                        inline ? (
                          <code className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto" {...props} />
                        ),
                      pre: ({node, ...props}) => <pre className="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-x-auto mb-3" {...props} />,
                    }}
                  >
                    {runbook.runbookProcedures}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No procedures documented yet.</p>
              )}
            </div>

            {/* Architecture */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Architecture</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upstream Services (Dependencies)</h3>
                  {runbook.upstreamServices && runbook.upstreamServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {runbook.upstreamServices.map((service, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No upstream services defined</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Downstream Services (Consumers)</h3>
                  {runbook.downstreamServices && runbook.downstreamServices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {runbook.downstreamServices.map((service, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No downstream services defined</p>
                  )}
                </div>
              </div>
            </div>

            {/* Related Incidents */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Related Incidents</h2>
              {runbook.relatedIncidents && runbook.relatedIncidents.length > 0 ? (
                <div className="space-y-3">
                  {runbook.relatedIncidents.map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents/${incident.id}`}
                      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                              {incident.incidentNumber}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                              {incident.severity}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">{incident.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(incident.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No related incidents</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Information */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Information</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Team</p>
                    <p className="text-sm text-gray-900 dark:text-white">{runbook.teamName}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact</p>
                    <a 
                      href={`mailto:${runbook.teamEmail}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {runbook.teamEmail}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Monitoring & Links */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monitoring & Links</h3>
              {runbook.monitoringLinks && runbook.monitoringLinks.length > 0 ? (
                <div className="space-y-2">
                  {runbook.monitoringLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all group"
                    >
                      <div className="flex items-center">
                        <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white group-hover:text-blue-600">
                          {link.name}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">No monitoring links configured</p>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Created</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(runbook.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(runbook.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
