'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Circle, AlertCircle, Info, RefreshCw, Pause, Search } from 'lucide-react';
import { formatTimestamp, formatDate } from '@/lib/utils';
import { KnowledgeGraphRecommendations } from './KnowledgeGraphRecommendations';
import { RACIMatrix } from './RACIMatrix';

type TimelineEvent = {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  metadata?: any;
};

type Incident = {
  id: string;
  status: string;
  timelineEvents: TimelineEvent[];
};

type Runbook = {
  id: string;
  serviceName: string;
  teamName: string;
  description: string;
};

interface InvestigationTabProps {
  incident: Incident;
  onRefresh: () => Promise<void>;
}

const eventTypeConfig = {
  reported: {
    icon: AlertCircle,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning/10',
    label: 'Incident reported',
  },
  accepted: {
    icon: Circle,
    color: 'text-status-critical',
    bgColor: 'bg-status-critical/10',
    label: 'Incident accepted',
  },
  update: {
    icon: Info,
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    label: 'Update shared',
  },
  status_change: {
    icon: RefreshCw,
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/10',
    label: 'Status changed',
  },
  no_update: {
    icon: Pause,
    color: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    label: 'No update scheduled',
  },
};

type User = {
  sys_id: string;
  name: string;
  email: string;
  title?: string;
};

type Group = {
  sys_id: string;
  name: string;
  description?: string;
};

export function InvestigationTab({ incident, onRefresh }: InvestigationTabProps) {
  const [newUpdate, setNewUpdate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandType, setCommandType] = useState<'main' | 'services' | 'users' | 'groups'>('main');
  const [commandPosition, setCommandPosition] = useState({ top: 0, left: 0 });
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRunbooks, setLoadingRunbooks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch data when showing menus
  useEffect(() => {
    if (commandType === 'services') {
      fetchRunbooks();
    } else if (commandType === 'users' && searchQuery) {
      fetchUsers();
    } else if (commandType === 'groups') {
      fetchGroups();
    }
  }, [commandType, searchQuery]);

  const fetchRunbooks = async () => {
    setLoadingRunbooks(true);
    try {
      const url = searchQuery
        ? `/api/runbooks?search=${encodeURIComponent(searchQuery)}`
        : '/api/runbooks';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRunbooks(data);
      }
    } catch (error) {
      console.error('Error fetching runbooks:', error);
    } finally {
      setLoadingRunbooks(false);
    }
  };

  const fetchUsers = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    setLoadingUsers(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/servicenow/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(
        'http://localhost:3001/api/servicenow/assignment-groups?limit=20'
      );
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Group events by date
  const groupedEvents = incident.timelineEvents.reduce((acc, event) => {
    const date = formatDate(event.createdAt);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewUpdate(value);

    // Check for / command
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    if (lastSlash !== -1 && (lastSlash === cursorPosition - 1 || textBeforeCursor.substring(lastSlash + 1, cursorPosition).trim() === '')) {
      // Show command menu
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        setCommandPosition({
          top: rect.top - 150,
          left: rect.left + 20,
        });
        setShowCommandMenu(true);
        setCommandType('main');
      }
    } else {
      setShowCommandMenu(false);
    }
  };

  const selectCommandType = (type: 'services' | 'users' | 'groups') => {
    setCommandType(type);
    setSearchQuery('');
  };

  const insertService = (runbook: Runbook) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newUpdate.substring(0, cursorPosition);
    const textAfterCursor = newUpdate.substring(cursorPosition);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    const newText =
      textBeforeCursor.substring(0, lastSlash) +
      `[${runbook.serviceName}](/runbooks/${runbook.id}) ` +
      textAfterCursor;

    setNewUpdate(newText);
    setShowCommandMenu(false);
    setCommandType('main');
    textareaRef.current?.focus();
  };

  const insertUser = (user: User) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newUpdate.substring(0, cursorPosition);
    const textAfterCursor = newUpdate.substring(cursorPosition);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    const newText =
      textBeforeCursor.substring(0, lastSlash) +
      `@${user.name} (${user.email}) ` +
      textAfterCursor;

    setNewUpdate(newText);
    setShowCommandMenu(false);
    setCommandType('main');
    textareaRef.current?.focus();
  };

  const insertGroup = (group: Group) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newUpdate.substring(0, cursorPosition);
    const textAfterCursor = newUpdate.substring(cursorPosition);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    const newText =
      textBeforeCursor.substring(0, lastSlash) +
      `@group:${group.name} ` +
      textAfterCursor;

    setNewUpdate(newText);
    setShowCommandMenu(false);
    setCommandType('main');
    textareaRef.current?.focus();
  };

  const insertText = (text: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newUpdate.substring(0, cursorPosition);
    const textAfterCursor = newUpdate.substring(cursorPosition);
    const lastSlash = textBeforeCursor.lastIndexOf('/');

    const newText =
      textBeforeCursor.substring(0, lastSlash) +
      text +
      textAfterCursor;

    setNewUpdate(newText);
    textareaRef.current?.focus();
  };

  const submitUpdate = async () => {
    if (!newUpdate.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newUpdate,
          eventType: 'update',
        }),
      });

      if (response.ok) {
        setNewUpdate('');
        await onRefresh();
      }
    } catch (error) {
      console.error('Error submitting update:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Knowledge Graph Recommendations - Only show for active incidents */}
      <KnowledgeGraphRecommendations
        incidentId={incident.id}
        incidentStatus={incident.status}
      />

      {/* RACI Matrix */}
      <RACIMatrix incidentId={incident.id} />

      {/* Add Update Form */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Share Update
        </h3>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newUpdate}
            onChange={handleTextChange}
            placeholder="Type / to reference services, people, or teams..."
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-status-info resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                submitUpdate();
              } else if (e.key === 'Escape' && showCommandMenu) {
                setShowCommandMenu(false);
              }
            }}
          />

          {/* Command Menu */}
          {showCommandMenu && (
            <div
              className="fixed z-50 bg-white border border-border rounded-lg shadow-lg py-2 w-80"
              style={{
                top: `${commandPosition.top}px`,
                left: `${commandPosition.left}px`,
              }}
            >
              {commandType === 'main' ? (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-text-secondary">
                    Insert reference
                  </div>
                  <button
                    onClick={() => selectCommandType('services')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-background transition-colors"
                  >
                    <div className="font-medium text-text-primary">Services</div>
                    <div className="text-xs text-text-secondary">
                      Reference a service or API
                    </div>
                  </button>
                  <button
                    onClick={() => selectCommandType('users')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-background transition-colors"
                  >
                    <div className="font-medium text-text-primary">Users</div>
                    <div className="text-xs text-text-secondary">
                      Mention a user from ServiceNow
                    </div>
                  </button>
                  <button
                    onClick={() => selectCommandType('groups')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-background transition-colors"
                  >
                    <div className="font-medium text-text-primary">Groups</div>
                    <div className="text-xs text-text-secondary">
                      Reference an assignment group
                    </div>
                  </button>
                </>
              ) : commandType === 'services' ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-text-secondary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search services..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-status-info"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loadingRunbooks ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        Loading services...
                      </div>
                    ) : runbooks.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        No services found
                      </div>
                    ) : (
                      runbooks.map((runbook) => (
                        <button
                          key={runbook.id}
                          onClick={() => insertService(runbook)}
                          className="w-full px-3 py-2 text-left hover:bg-background transition-colors"
                        >
                          <div className="font-medium text-sm text-text-primary">
                            {runbook.serviceName}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {runbook.teamName} • {runbook.description.substring(0, 60)}...
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-border">
                    <button
                      onClick={() => {
                        setCommandType('main');
                        setSearchQuery('');
                      }}
                      className="text-xs text-status-info hover:text-blue-600"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              ) : commandType === 'users' ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-text-secondary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users... (min 2 chars)"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-status-info"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        Loading users...
                      </div>
                    ) : searchQuery.length < 2 ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        Type at least 2 characters to search
                      </div>
                    ) : users.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        No users found
                      </div>
                    ) : (
                      users.map((user) => (
                        <button
                          key={user.sys_id}
                          onClick={() => insertUser(user)}
                          className="w-full px-3 py-2 text-left hover:bg-background transition-colors"
                        >
                          <div className="font-medium text-sm text-text-primary">
                            {user.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {user.email} {user.title && `• ${user.title}`}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-border">
                    <button
                      onClick={() => {
                        setCommandType('main');
                        setSearchQuery('');
                      }}
                      className="text-xs text-status-info hover:text-blue-600"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              ) : commandType === 'groups' ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <div className="text-xs font-semibold text-text-secondary">
                      Assignment Groups
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {loadingGroups ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        Loading groups...
                      </div>
                    ) : groups.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        No groups found
                      </div>
                    ) : (
                      groups.map((group) => (
                        <button
                          key={group.sys_id}
                          onClick={() => insertGroup(group)}
                          className="w-full px-3 py-2 text-left hover:bg-background transition-colors"
                        >
                          <div className="font-medium text-sm text-text-primary">
                            {group.name}
                          </div>
                          {group.description && (
                            <div className="text-xs text-text-secondary">
                              {group.description.substring(0, 60)}...
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-border">
                    <button
                      onClick={() => {
                        setCommandType('main');
                        setSearchQuery('');
                      }}
                      className="text-xs text-status-info hover:text-blue-600"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-text-secondary">
              Press ⌘+Enter to submit
            </p>
            <button
              onClick={submitUpdate}
              disabled={!newUpdate.trim() || isSubmitting}
              className="px-4 py-2 bg-status-info text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sharing...' : 'Share Update'}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-text-primary">
            Activity Timeline (to and from SNOW)
          </h3>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, events]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs font-medium text-text-secondary">
                  {date}
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Events for this date */}
              <div className="space-y-4">
                {events.map((event) => {
                  const config =
                    eventTypeConfig[
                      event.eventType as keyof typeof eventTypeConfig
                    ] || eventTypeConfig.update;
                  const Icon = config.icon;

                  return (
                    <div key={event.id} className="flex gap-4">
                      {/* Time */}
                      <div className="w-16 flex-shrink-0 text-right">
                        <span className="text-xs font-mono text-text-secondary">
                          {formatTimestamp(event.createdAt)}
                        </span>
                      </div>

                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}
                        >
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div 
                              className="text-sm text-text-primary prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ 
                                __html: event.description.replace(
                                  /\[([^\]]+)\]\(([^)]+)\)/g,
                                  '<a href="$2" class="text-status-info hover:text-blue-600 underline">$1</a>'
                                )
                              }}
                            />
                            <div className="flex items-center gap-2 mt-1">
                              {event.user && event.user.name ? (
                                <>
                                  <div className="w-5 h-5 bg-accent-purple/10 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-accent-purple">
                                      {event.user.name.charAt(0)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-text-secondary">
                                    {event.user.name}
                                  </span>
                                </>
                              ) : event.metadata?.createdBy ? (
                                <>
                                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">
                                      S
                                    </span>
                                  </div>
                                  <span className="text-xs text-text-secondary">
                                    {event.metadata.createdBy} (ServiceNow)
                                  </span>
                                </>
                              ) : null}
                              {event.metadata?.source === 'servicenow' && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {event.metadata.label || 'ServiceNow'}
                                </span>
                              )}
                              <span className="text-xs text-text-secondary">
                                via @incident
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {incident.timelineEvents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-text-secondary">
                No timeline events yet. Share an update to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
