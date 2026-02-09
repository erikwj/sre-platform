'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { AlertCircle, X, Loader2 } from 'lucide-react';

const incidentSchema = z.object({
  incidentNumber: z.string().min(1, 'Incident number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['major', 'preemptive_major']),
  incidentLead: z.string().min(1, 'Incident lead is required'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function NewIncidentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importFromSnow, setImportFromSnow] = useState(true);
  const [isLoadingSnowData, setIsLoadingSnowData] = useState(false);
  const [incidentNumberInput, setIncidentNumberInput] = useState('');
  const [snowSysId, setSnowSysId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      severity: 'major',
      incidentLead: 'Manager on Duty', // Auto-populate for demo
    },
  });

  const incidentNumber = watch('incidentNumber');

  // Fetch incident details from ServiceNow when incident number changes
  useEffect(() => {
    const fetchSnowData = async () => {
      if (!incidentNumber || !importFromSnow || incidentNumber.length < 5) {
        return;
      }

      setIsLoadingSnowData(true);
      setError(null);

      try {
        const response = await fetch(`/api/servicenow/incident-by-number/${encodeURIComponent(incidentNumber)}`);
        
        if (response.ok) {
          const data = await response.json();
          setValue('title', data.short_description || '');
          setValue('description', data.description || '');
          setSnowSysId(data.sys_id || null);
        } else if (response.status === 404) {
          // Incident not found, clear fields but don't show error
          setValue('title', '');
          setValue('description', '');
          setSnowSysId(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch incident from ServiceNow');
        }
      } catch (err) {
        console.error('Error fetching ServiceNow data:', err);
        setError('Failed to connect to ServiceNow');
      } finally {
        setIsLoadingSnowData(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchSnowData();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [incidentNumber, importFromSnow, setValue]);

  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          snowSysId: importFromSnow ? snowSysId : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create incident');
      }

      const incident = await response.json();
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800">
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
                  href="/runbooks"
                  className="text-sm text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Runbooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-border dark:border-gray-700 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-status-critical/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-status-critical" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary dark:text-white">
                  Declare Major Incident
                </h1>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  Create a new incident to track and manage the response
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-6">
            {error && (
              <div className="bg-status-critical/10 border border-status-critical/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-status-critical flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-status-critical font-medium">
                    Error creating incident
                  </p>
                  <p className="text-sm text-status-critical/80 mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-status-critical/60 hover:text-status-critical"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Import from ServiceNow Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-border dark:border-gray-600">
              <div className="flex-1">
                <label htmlFor="importToggle" className="text-sm font-medium text-text-primary dark:text-white">
                  Import details from ServiceNow?
                </label>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                  Automatically fill title and description from ServiceNow incident
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportFromSnow(!importFromSnow)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 ${
                  importFromSnow ? 'bg-status-info' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                id="importToggle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    importFromSnow ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Incident Number */}
            <div>
              <label
                htmlFor="incidentNumber"
                className="block text-sm font-medium text-text-primary dark:text-white mb-2"
              >
                Incident Number <span className="text-status-critical">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('incidentNumber')}
                  type="text"
                  id="incidentNumber"
                  placeholder="INC-XXXXXX (from ServiceNow)"
                  className="w-full px-4 py-2 border border-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                {isLoadingSnowData && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-status-info animate-spin" />
                  </div>
                )}
              </div>
              {errors.incidentNumber && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.incidentNumber.message}
                </p>
              )}
              {importFromSnow && (
                <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                  Enter ServiceNow incident number to auto-fill details
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-primary dark:text-white mb-2"
              >
                Title <span className="text-status-critical">*</span>
              </label>
              <input
                {...register('title')}
                type="text"
                id="title"
                placeholder="Brief description of the incident"
                disabled={importFromSnow && isLoadingSnowData}
                className="w-full px-4 py-2 border border-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-primary dark:text-white mb-2"
              >
                Short Description <span className="text-status-critical">*</span>
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={4}
                placeholder="What is happening? What services are affected?"
                disabled={importFromSnow && isLoadingSnowData}
                className="w-full px-4 py-2 border border-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent resize-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="block text-sm font-medium text-text-primary dark:text-white mb-2"
              >
                Severity <span className="text-status-critical">*</span>
              </label>
              <select
                {...register('severity')}
                id="severity"
                className="w-full px-4 py-2 border border-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="major">Major</option>
                <option value="preemptive_major">Preemptive Major</option>
              </select>
              {errors.severity && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.severity.message}
                </p>
              )}
            </div>

            {/* Incident Lead */}
            <div>
              <label
                htmlFor="incidentLead"
                className="block text-sm font-medium text-text-primary dark:text-white mb-2"
              >
                Incident Lead <span className="text-status-critical">*</span>
              </label>
              <input
                {...register('incidentLead')}
                type="text"
                id="incidentLead"
                placeholder="Manager on Duty"
                className="w-full px-4 py-2 border border-border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {errors.incidentLead && (
                <p className="mt-1 text-sm text-status-critical">
                  {errors.incidentLead.message}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                Auto-populated with current Manager on Duty
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border dark:border-gray-700">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-status-critical text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Declare Incident'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
