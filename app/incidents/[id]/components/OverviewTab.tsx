'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';

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

  // Update local state when incident changes
  useEffect(() => {
    setProblemStatement(incident.problemStatement || '');
    setImpact(incident.impact || '');
    setCauses(incident.causes || '');
    setStepsToResolve(incident.stepsToResolve || '');
  }, [incident]);

  // Fetch available users when assignment dropdown is opened
  useEffect(() => {
    if (assigningActionId && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [assigningActionId]);

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
      {/* Problem Statement */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
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
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white"
        />
      </div>

      {/* Impact */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Impact</h3>
        <textarea
          value={impact}
          onChange={(e) => {
            setImpact(e.target.value);
            updateField('impact', e.target.value);
          }}
          placeholder="What was the impact? Which services or customers were affected?"
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white"
        />
      </div>

      {/* Causes */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Causes</h3>
        <textarea
          value={causes}
          onChange={(e) => {
            setCauses(e.target.value);
            updateField('causes', e.target.value);
          }}
          placeholder="What caused this incident?"
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white"
        />
      </div>

      {/* Steps to Resolve */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
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
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none bg-white"
        />
      </div>

      {/* Action Items */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Action Items</h3>
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
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-background transition-colors group"
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
                      ? 'text-text-secondary line-through'
                      : 'text-text-primary'
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
                      <span className="text-xs text-text-secondary">
                        {action.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      {assigningActionId === action.id ? (
                        <div className="absolute top-0 left-0 z-10 bg-white border border-border rounded-lg shadow-lg p-2 w-64">
                          <div className="max-h-48 overflow-y-auto">
                            {loadingUsers ? (
                              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                                Loading users...
                              </div>
                            ) : availableUsers.length > 0 ? (
                              availableUsers.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => assignActionItem(action.id, user.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-background rounded text-sm transition-colors flex items-center gap-2"
                                >
                                  <div className="w-6 h-6 bg-accent-purple/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-accent-purple">
                                      {user.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-text-primary font-medium truncate">
                                      {user.name}
                                    </div>
                                    <div className="text-xs text-text-secondary truncate">
                                      {user.email}
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-text-secondary text-center">
                                No users available
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setAssigningActionId(null)}
                            className="w-full mt-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border-t border-border pt-2"
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
            <div className="space-y-2 p-3 bg-background rounded-lg">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Enter action item..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info"
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
                  className="px-3 py-1.5 bg-gray-100 text-text-secondary text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {incident.actionItems.length === 0 && !isAddingAction && (
            <p className="text-sm text-text-secondary italic text-center py-4">
              No action items yet. Click "Add Action" to create one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
