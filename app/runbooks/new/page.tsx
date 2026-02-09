'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, AlertCircle } from "lucide-react";

interface MonitoringLink {
  name: string;
  url: string;
}

export default function NewRunbookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    serviceName: '',
    teamName: '',
    teamEmail: '',
    description: '',
    runbookProcedures: '',
  });

  const [monitoringLinks, setMonitoringLinks] = useState<MonitoringLink[]>([]);
  const [upstreamServices, setUpstreamServices] = useState<string[]>([]);
  const [downstreamServices, setDownstreamServices] = useState<string[]>([]);

  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newUpstream, setNewUpstream] = useState('');
  const [newDownstream, setNewDownstream] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/runbooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          monitoringLinks: monitoringLinks.length > 0 ? monitoringLinks : null,
          upstreamServices: upstreamServices.length > 0 ? upstreamServices : null,
          downstreamServices: downstreamServices.length > 0 ? downstreamServices : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/runbooks/${data.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create runbook');
      }
    } catch (err) {
      setError('Failed to create runbook. Please try again.');
      console.error('Error creating runbook:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMonitoringLink = () => {
    if (newLinkName && newLinkUrl) {
      setMonitoringLinks([...monitoringLinks, { name: newLinkName, url: newLinkUrl }]);
      setNewLinkName('');
      setNewLinkUrl('');
    }
  };

  const removeMonitoringLink = (index: number) => {
    setMonitoringLinks(monitoringLinks.filter((_, i) => i !== index));
  };

  const addUpstreamService = () => {
    if (newUpstream && !upstreamServices.includes(newUpstream)) {
      setUpstreamServices([...upstreamServices, newUpstream]);
      setNewUpstream('');
    }
  };

  const removeUpstreamService = (service: string) => {
    setUpstreamServices(upstreamServices.filter(s => s !== service));
  };

  const addDownstreamService = () => {
    if (newDownstream && !downstreamServices.includes(newDownstream)) {
      setDownstreamServices([...downstreamServices, newDownstream]);
      setNewDownstream('');
    }
  };

  const removeDownstreamService = (service: string) => {
    setDownstreamServices(downstreamServices.filter(s => s !== service));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                SRE Platform
              </Link>
              <div className="flex space-x-6">
                <Link 
                  href="/incidents" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Incidents
                </Link>
                <Link 
                  href="/postmortems" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Postmortems
                </Link>
                <Link 
                  href="/runbooks" 
                  className="text-sm font-semibold text-gray-900"
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

      <main className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/runbooks"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Runbooks
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Runbook</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="serviceName"
                    required
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Payment API"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      required
                      value={formData.teamName}
                      onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Payments"
                    />
                  </div>

                  <div>
                    <label htmlFor="teamEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Team Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="teamEmail"
                      required
                      value={formData.teamEmail}
                      onChange={(e) => setFormData({ ...formData, teamEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="team@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the service..."
                  />
                </div>
              </div>
            </div>

            {/* Monitoring Links */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Monitoring & Links</h2>
              <div className="space-y-3">
                {monitoringLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{link.name}</p>
                      <p className="text-xs text-gray-600 truncate">{link.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMonitoringLink(index)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    placeholder="Link name (e.g., Grafana Dashboard)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addMonitoringLink}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Architecture */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Architecture</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upstream Services (Dependencies)
                  </label>
                  <div className="space-y-2">
                    {upstreamServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {upstreamServices.map((service) => (
                          <span 
                            key={service}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm"
                          >
                            {service}
                            <button
                              type="button"
                              onClick={() => removeUpstreamService(service)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newUpstream}
                        onChange={(e) => setNewUpstream(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUpstreamService())}
                        placeholder="Service name"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addUpstreamService}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Downstream Services (Consumers)
                  </label>
                  <div className="space-y-2">
                    {downstreamServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {downstreamServices.map((service) => (
                          <span 
                            key={service}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm"
                          >
                            {service}
                            <button
                              type="button"
                              onClick={() => removeDownstreamService(service)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDownstream}
                        onChange={(e) => setNewDownstream(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDownstreamService())}
                        placeholder="Service name"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addDownstreamService}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Runbook Procedures */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Runbook Procedures</h2>
              <textarea
                id="runbookProcedures"
                rows={12}
                value={formData.runbookProcedures}
                onChange={(e) => setFormData({ ...formData, runbookProcedures: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Document common issues, deployment steps, rollback procedures, health checks, etc."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <Link
                href="/runbooks"
                className="px-6 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Runbook'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
