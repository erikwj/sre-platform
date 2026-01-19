'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, Sparkles, MessageSquare, Circle, Info, RefreshCw, Pause, X, Send, Bot } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

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

type Postmortem = {
  id: string;
  incidentId: string;
  status: string;
  introduction: string;
  timelineSummary: string;
  rootCause: string;
  impactAnalysis: string;
  howWeFixedIt: string;
  actionItems: Array<{ description: string; priority: string }>;
  lessonsLearned: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type PostmortemTabProps = {
  incident: any;
  onRefresh: () => void;
};

const eventTypeConfig = {
  reported: {
    icon: AlertCircle,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning/10',
    label: 'Reported',
  },
  accepted: {
    icon: Circle,
    color: 'text-status-critical',
    bgColor: 'bg-status-critical/10',
    label: 'Accepted',
  },
  update: {
    icon: Info,
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    label: 'Update',
  },
  status_change: {
    icon: RefreshCw,
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/10',
    label: 'Status Change',
  },
  no_update: {
    icon: Pause,
    color: 'text-text-secondary',
    bgColor: 'bg-gray-100',
    label: 'No Update',
  },
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function PostmortemTab({ incident, onRefresh }: PostmortemTabProps) {
  const [postmortem, setPostmortem] = useState<Postmortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [autoGenerateAttempted, setAutoGenerateAttempted] = useState(false);

  useEffect(() => {
    fetchPostmortem();
  }, [incident.id]);

  // Auto-generate postmortem when tab is accessed if conditions are met
  useEffect(() => {
    const canGenerate = incident.status === 'resolved' || incident.status === 'closed';
    
    // Check if postmortem is empty (all key fields are empty or null)
    const isPostmortemEmpty = postmortem && (
      !postmortem.introduction?.trim() &&
      !postmortem.timelineSummary?.trim() &&
      !postmortem.rootCause?.trim() &&
      !postmortem.impactAnalysis?.trim() &&
      !postmortem.howWeFixedIt?.trim() &&
      !postmortem.lessonsLearned?.trim()
    );
    
    if (!loading && (!postmortem || isPostmortemEmpty) && canGenerate && !autoGenerateAttempted && !generating) {
      setAutoGenerateAttempted(true);
      generatePostmortem(true); // Pass true to indicate auto-generation
    }
  }, [loading, postmortem, incident.status, autoGenerateAttempted, generating]);

  const fetchPostmortem = async () => {
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`);
      if (!response.ok) throw new Error('Failed to fetch postmortem');
      const data = await response.json();
      setPostmortem(data.postmortem || data);
    } catch (error) {
      console.error('Error fetching postmortem:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePostmortem = async (autoGenerate: boolean = false) => {
    // Only show confirmation if manually triggered
    if (!autoGenerate && !confirm('Generate AI postmortem? This will analyze the incident data and create a comprehensive postmortem document.')) {
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate postmortem');
      }

      const data = await response.json();
      setPostmortem(data);
    } catch (error) {
      console.error('Error generating postmortem:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate postmortem');
    } finally {
      setGenerating(false);
    }
  };

  const updateSection = async (field: string, value: any) => {
    if (!postmortem) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error('Failed to update postmortem');
      const data = await response.json();
      setPostmortem(data);
    } catch (error) {
      console.error('Error updating postmortem:', error);
    } finally {
      setSaving(false);
    }
  };

  const checkPostmortem = async () => {
    if (!postmortem) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: 'Check the quality of this postmortem',
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setAiLoading(true);

    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          postmortem,
        }),
      });

      if (!response.ok) throw new Error('Failed to check postmortem');
      const data = await response.json();
      
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.feedback,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error checking postmortem:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Failed to analyze postmortem. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !postmortem || aiLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setAiLoading(true);

    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question: userMessage.content,
          postmortem,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error asking AI:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Failed to get AI response. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  const publishPostmortem = async () => {
    if (!confirm('Publish this postmortem? It will be marked as final and shared with the team.')) {
      return;
    }

    await updateSection('status', 'published');
  };

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-8 text-center">
        <Loader2 className="w-8 h-8 text-status-info animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading postmortem...</p>
      </div>
    );
  }

  // Show generate button if no postmortem exists and incident is resolved/closed
  if (!postmortem) {
    const canGenerate = incident.status === 'resolved' || incident.status === 'closed';

    return (
      <div className="bg-white border border-border rounded-lg p-8">
        <div className="text-center max-w-2xl mx-auto">
          <FileText className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No Postmortem Yet
          </h3>
          {canGenerate ? (
            <>
              <p className="text-text-secondary mb-6">
                Generate an AI-powered postmortem based on the incident timeline, actions taken, and impact analysis.
              </p>
              <button
                onClick={() => generatePostmortem(false)}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Postmortem...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Postmortem with AI
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="text-text-secondary">
              Postmortem can only be generated after the incident is resolved or closed.
              <br />
              Current status: <span className="font-medium capitalize">{incident.status}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Get timeline events from incident
  const timelineEvents: TimelineEvent[] = incident.timelineEvents || [];

  return (
    <div className="relative">
      {/* Main Editor - Full Width */}
      <div className="space-y-6">
        {/* Status Banner */}
        {postmortem.status === 'published' && (
          <div className="bg-status-success/10 border border-status-success rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-status-success" />
            <div>
              <p className="text-sm font-medium text-status-success">Published</p>
              <p className="text-xs text-text-secondary">
                This postmortem was published on {new Date(postmortem.publishedAt!).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Horizontal Timeline */}
        {timelineEvents.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Incident Timeline
            </h3>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" />
              
              {/* Timeline Events */}
              <div className="relative flex justify-between items-start gap-2 overflow-x-auto pb-2">
                {timelineEvents.map((event, index) => {
                  const config = eventTypeConfig[event.eventType as keyof typeof eventTypeConfig] || eventTypeConfig.update;
                  const Icon = config.icon;
                  
                  return (
                    <div key={event.id} className="flex flex-col items-center min-w-[120px] flex-shrink-0">
                      {/* Icon */}
                      <div className={`relative z-10 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center border-2 border-white shadow-sm`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      
                      {/* Time */}
                      <div className="mt-2 text-xs font-mono text-text-secondary whitespace-nowrap">
                        {formatTimestamp(event.createdAt)}
                      </div>
                      
                      {/* Label */}
                      <div className="mt-1 text-xs font-medium text-text-primary text-center">
                        {config.label}
                      </div>
                      
                      {/* Description (truncated) */}
                      <div className="mt-1 text-xs text-text-secondary text-center line-clamp-2 max-w-[120px]">
                        {event.description.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        {saving && (
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}

        {/* Introduction */}
        <Section
          title="Introduction"
          content={postmortem.introduction}
          onSave={(value) => updateSection('introduction', value)}
          isEditing={editingSection === 'introduction'}
          onEdit={() => setEditingSection('introduction')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Timeline Summary */}
        <Section
          title="Timeline Summary"
          content={postmortem.timelineSummary}
          onSave={(value) => updateSection('timelineSummary', value)}
          isEditing={editingSection === 'timelineSummary'}
          onEdit={() => setEditingSection('timelineSummary')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Root Cause */}
        <Section
          title="Root Cause"
          content={postmortem.rootCause}
          onSave={(value) => updateSection('rootCause', value)}
          isEditing={editingSection === 'rootCause'}
          onEdit={() => setEditingSection('rootCause')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Impact Analysis */}
        <Section
          title="Impact Analysis"
          content={postmortem.impactAnalysis}
          onSave={(value) => updateSection('impactAnalysis', value)}
          isEditing={editingSection === 'impactAnalysis'}
          onEdit={() => setEditingSection('impactAnalysis')}
          onCancel={() => setEditingSection(null)}
        />

        {/* How We Fixed It */}
        <Section
          title="How We Fixed It"
          content={postmortem.howWeFixedIt}
          onSave={(value) => updateSection('howWeFixedIt', value)}
          isEditing={editingSection === 'howWeFixedIt'}
          onEdit={() => setEditingSection('howWeFixedIt')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Action Items */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Action Items</h3>
          <div className="space-y-3">
            {(postmortem.actionItems || []).map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-background rounded border border-border">
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{item.description}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                    item.priority === 'high' ? 'bg-status-critical/10 text-status-critical' :
                    item.priority === 'medium' ? 'bg-status-warning/10 text-status-warning' :
                    'bg-status-info/10 text-status-info'
                  }`}>
                    {item.priority} priority
                  </span>
                </div>
              </div>
            ))}
            {(!postmortem.actionItems || postmortem.actionItems.length === 0) && (
              <p className="text-sm text-text-secondary italic">No action items yet</p>
            )}
          </div>
        </div>

        {/* Lessons Learned */}
        <Section
          title="Lessons Learned"
          content={postmortem.lessonsLearned}
          onSave={(value) => updateSection('lessonsLearned', value)}
          isEditing={editingSection === 'lessonsLearned'}
          onEdit={() => setEditingSection('lessonsLearned')}
          onCancel={() => setEditingSection(null)}
        />

        {/* Actions */}
        {postmortem.status !== 'published' && (
          <div className="flex gap-3">
            <button
              onClick={publishPostmortem}
              className="px-4 py-2 bg-status-success text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Publish Postmortem
            </button>
          </div>
        )}
      </div>

      {/* Floating AI Assistant Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-purple text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 flex items-center justify-center z-40"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chatbot Popup */}
      {showChatbot && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white border border-border rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-accent-purple text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <button
              onClick={() => setShowChatbot(false)}
              className="hover:bg-purple-700 rounded p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action */}
          <div className="p-3 border-b border-border bg-background">
            <button
              onClick={checkPostmortem}
              disabled={aiLoading}
              className="w-full px-3 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Check Postmortem Quality
                </>
              )}
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-accent-purple opacity-50" />
                <p className="mb-2">Hi! I'm your AI assistant.</p>
                <p>Ask me anything about this postmortem or click the button above to check its quality.</p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-accent-purple" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-accent-purple text-white'
                        : 'bg-background text-text-primary border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-purple-200' : 'text-text-secondary'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-status-info/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-status-info">You</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {aiLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-accent-purple" />
                </div>
                <div className="bg-background text-text-primary border border-border rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about the postmortem..."
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
                disabled={aiLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || aiLoading}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SectionProps = {
  title: string;
  content: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
};

function Section({ title, content, onSave, isEditing, onEdit, onCancel }: SectionProps) {
  const [editValue, setEditValue] = useState(content);

  useEffect(() => {
    setEditValue(content);
  }, [content]);

  const handleSave = () => {
    onSave(editValue);
    onCancel();
  };

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="text-sm text-status-info hover:text-blue-600 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-status-info min-h-[150px]"
            rows={8}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-status-info text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:bg-background transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-primary whitespace-pre-wrap">
          {content || <span className="text-text-secondary italic">No content yet</span>}
        </div>
      )}
    </div>
  );
}
