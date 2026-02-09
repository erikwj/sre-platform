'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type Incident = {
  id: string;
  problemStatement?: string;
  impact?: string;
  causes?: string;
  stepsToResolve?: string;
  actionItems: any[];
};

interface OverviewTabProps {
  incident: Incident;
  onUpdate: (updates: Partial<Incident>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

type User = {
  id: string;
  name: string;
  email: string;
};

export function OverviewTab({ incident, onUpdate, onRefresh }: OverviewTabProps) {
  const [problemStatement, setProblemStatement] = useState(incident.problemStatement || '');
  const [impact, setImpact] = useState(incident.impact || '');
  const [causes, setCauses] = useState(incident.causes || '');
  const [stepsToResolve, setStepsToResolve] = useState(incident.stepsToResolve || '');
  const [newAction, setNewAction] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [assigningActionId, setAssigningActionId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // AI Summary states
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Update local state when incident changes
  useEffect(() => {
    setProblemStatement(incident.problemStatement || '');
    setImpact(incident.impact || '');
    setCauses(incident.causes || '');
    setStepsToResolve(incident.stepsToResolve || '');
  }, [incident]);

  // Generate AI summary when component loads or when incident data changes
  useEffect(() => {
    const hasData = incident.problemStatement || incident.impact || 
                    incident.causes || incident.stepsToResolve;
    if (hasData && !aiSummary) {
      generateAISummary();
    }
  }, [incident.id, incident.problemStatement, incident.impact, incident.causes, incident.stepsToResolve]);

  // Fetch available users when assignment dropdown is opened
  useEffect(() => {
    if (assigningActionId && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [assigningActionId]);

  const generateAISummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setSummaryError('Failed to generate AI summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Debounced update function
  const updateField = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  const addActionItem = async () => {
    if (!newAction.trim()) return;

    try {
      const response = await fetch(`/api/incidents/${incident.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newAction }),
      });

      if (response.ok) {
        setNewAction('');
        setIsAddingAction(false);
        await onRefresh();
      }
    } catch (error) {
      console.error('Error adding action item:', error);
    }
  };

  const toggleActionItem = async (actionId: string, completed: boolean) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      await onRefresh();
    } catch (error) {
      console.error('Error toggling action item:', error);
    }
  };

  const deleteActionItem = async (actionId: string) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  const assignActionItem = async (actionId: string, userId: string) => {
    try {
      await fetch(`/api/incidents/${incident.id}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId }),
      });
      setAssigningActionId(null);
      await onRefresh();
    } catch (error) {
      console.error('Error assigning action item:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Summary Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Executive Summary</h3>
          </div>
          <button
            onClick={generateAISummary}
            disabled={loadingSummary}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
            title="Regenerate summary"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingSummary && (
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-sm">Analyzing incident data...</span>
          </div>
        )}

        {summaryError && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            {summaryError}
          </div>
        )}

        {!loadingSummary && !summaryError && aiSummary && (
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
          </div>
        )}

        {!loadingSummary && !summaryError && !aiSummary && (
          <div className="text-gray-500 dark:text-gray-400 text-sm italic">
            Fill in incident details below to generate an AI summary.
          </div>
        )}

        {/* Toggle Details Button */}
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Raw Details</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>View Raw Details</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Raw Details Section - Collapsible */}
      {showDetails && (
        <div className="space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Incident Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Edit the fields below to update incident information. Changes will regenerate the AI summary.
            </p>
          </div>

          {/* Problem Statement */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
              Problem Statement
            </h3>
            <textarea
              value={problemStatement}
              onChange={(e) => {
                setProblemStatement(e.target.value);
                updateField('problemStatement', e.target.value);
              }}
              placeholder="Describe the problem that occurred..."
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Impact */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Impact</h3>
            <textarea
              value={impact}
              onChange={(e) => {
                setImpact(e.target.value);
                updateField('impact', e.target.value);
              }}
              placeholder="What was the impact? Which services or customers were affected?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Causes */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">Causes</h3>
            <textarea
              value={causes}
              onChange={(e) => {
                setCauses(e.target.value);
                updateField('causes', e.target.value);
              }}
              placeholder="What caused this incident?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Steps to Resolve */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
              Steps to Resolve
            </h3>
            <textarea
              value={stepsToResolve}
              onChange={(e) => {
                setStepsToResolve(e.target.value);
                updateField('stepsToResolve', e.target.value);
              }}
              placeholder="What steps were taken to resolve the incident?"
              rows={4}
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">Action Items</h3>
          {!isAddingAction && (
            <button
              onClick={() => setIsAddingAction(true)}
              className="text-status-info hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          )}
        </div>

        <div className="space-y-3">
          {incident.actionItems.map((action) => (
            <div
              key={action.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-background dark:hover:bg-gray-700 transition-colors group"
            >
              <input
                type="checkbox"
                checked={action.completed}
                onChange={() => toggleActionItem(action.id, action.completed)}
                className="mt-1 w-4 h-4 rounded border-border text-status-success focus:ring-status-info cursor-pointer"
              />
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    action.completed
                      ? 'text-text-secondary dark:text-gray-500 line-through'
                      : 'text-text-primary dark:text-white'
                  }`}
                >
                  {action.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {action.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-accent-purple/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-accent-purple">
                          {action.assignedTo.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        {action.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      {assigningActionId === action.id ? (
                        <div className="absolute top-0 left-0 z-10 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg p-2 w-64">
                          <div className="max-h-48 overflow-y-auto">
                            {loadingUsers ? (
                              <div className="px-3 py-2 text-sm text-text-secondary dark:text-gray-400 text-center">
                                Loading users...
                              </div>
                            ) : availableUsers.length > 0 ? (
                              availableUsers.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => assignActionItem(action.id, user.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-background dark:hover:bg-gray-700 rounded text-sm transition-colors flex items-center gap-2"
                                >
                                  <div className="w-6 h-6 bg-accent-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-accent-purple">
                                      {user.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-text-primary dark:text-white font-medium truncate">
                                      {user.name}
                                    </div>
                                    <div className="text-xs text-text-secondary dark:text-gray-400 truncate">
                                      {user.email}
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-text-secondary dark:text-gray-400 text-center">
                                No users available
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setAssigningActionId(null)}
                            className="w-full mt-2 px-3 py-1.5 text-xs text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white border-t border-border dark:border-gray-700 pt-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningActionId(action.id)}
                          className="text-status-info hover:text-blue-600 transition-colors flex items-center gap-1 text-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Assign
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteActionItem(action.id)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-status-critical transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {isAddingAction && (
            <div className="space-y-2 p-3 bg-background dark:bg-gray-700 rounded-lg">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Enter action item..."
                className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addActionItem();
                  } else if (e.key === 'Escape') {
                    setIsAddingAction(false);
                    setNewAction('');
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addActionItem}
                  className="px-3 py-1.5 bg-status-info text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingAction(false);
                    setNewAction('');
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {incident.actionItems.length === 0 && !isAddingAction && (
            <p className="text-sm text-text-secondary dark:text-gray-400 italic text-center py-4">
              No action items yet. Click "Add Action" to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
