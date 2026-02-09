'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, Sparkles, AlertTriangle, Shield, Clock } from 'lucide-react';
import { Postmortem, GenerationStage, FIELD_TOOLTIPS, GENERATION_STAGES } from './postmortem/types';
import { calculateDuration, useDebounce } from './postmortem/utils';
import { InputField, TextAreaField, DateTimeField, CheckboxField, MultiSelectField, SectionCard } from './postmortem/FormFields';
import { CausalAnalysisEditor } from './postmortem/CausalAnalysisEditor';
import { AIChatbot } from './postmortem/AIChatbot';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';

type PostmortemTabProps = {
  incident: any;
  onRefresh: () => void;
};

export function PostmortemTab({ incident, onRefresh }: PostmortemTabProps) {
  const [postmortem, setPostmortem] = useState<Postmortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>(null);
  const [saving, setSaving] = useState(false);
  const [hasPostmortem, setHasPostmortem] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    fetchPostmortem();
    fetchUsers();
  }, [incident.id]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('[ERROR] Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchPostmortem = async () => {
    try {
      console.log('[DEBUG] Fetching postmortem for incident:', incident.id);
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`);
      if (!response.ok) throw new Error('Failed to fetch postmortem');
      const data = await response.json();
      
      console.log('[DEBUG] Fetched data:', data);
      
      // Handle both response formats: {postmortem: null} or direct postmortem object
      const postmortemData = data.postmortem !== undefined ? data.postmortem : (data.id ? data : null);
      
      console.log('[DEBUG] Processed postmortem data:', postmortemData);
      setPostmortem(postmortemData);
      setHasPostmortem(postmortemData !== null);
    } catch (error) {
      console.error('[ERROR] Error fetching postmortem:', error);
      setPostmortem(null);
      setHasPostmortem(false);
    } finally {
      setLoading(false);
    }
  };

  const generatePostmortem = async () => {
    // Check if any fields are filled
    const hasContent = postmortem && (
      postmortem.businessImpactDescription ||
      postmortem.mitigationDescription ||
      (postmortem.causalAnalysis && postmortem.causalAnalysis.length > 0)
    );

    if (hasContent) {
      if (!confirm('This will overwrite all existing content with AI-generated data. Do you want to continue?')) {
        return;
      }
    }

    console.log('[DEBUG] Starting chunked AI generation...');
    setGenerating(true);
    
    try {
      // Generate Business Impact
      console.log('[DEBUG] Generating business impact section...');
      setGenerationStage('business_impact');
      const businessImpactResponse = await fetch(`/api/incidents/${incident.id}/postmortem/generate-chunked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'business_impact',
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!businessImpactResponse.ok) {
        const error = await businessImpactResponse.json();
        console.error('[ERROR] Business impact generation failed:', error);
        throw new Error(error.error || 'Failed to generate business impact');
      }

      const businessImpactData = await businessImpactResponse.json();
      console.log('[DEBUG] Business impact generated:', businessImpactData);
      setPostmortem(businessImpactData.postmortem);
      setHasPostmortem(true);

      // Generate Mitigation
      console.log('[DEBUG] Generating mitigation section...');
      setGenerationStage('mitigation');
      const mitigationResponse = await fetch(`/api/incidents/${incident.id}/postmortem/generate-chunked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'mitigation',
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!mitigationResponse.ok) {
        const error = await mitigationResponse.json();
        console.error('[ERROR] Mitigation generation failed:', error);
        throw new Error(error.error || 'Failed to generate mitigation');
      }

      const mitigationData = await mitigationResponse.json();
      console.log('[DEBUG] Mitigation generated:', mitigationData);
      setPostmortem(mitigationData.postmortem);

      // Generate Causal Analysis
      console.log('[DEBUG] Generating causal analysis section...');
      setGenerationStage('causal_analysis');
      const causalAnalysisResponse = await fetch(`/api/incidents/${incident.id}/postmortem/generate-chunked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'causal_analysis',
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!causalAnalysisResponse.ok) {
        const error = await causalAnalysisResponse.json();
        console.error('[ERROR] Causal analysis generation failed:', error);
        throw new Error(error.error || 'Failed to generate causal analysis');
      }

      const causalAnalysisData = await causalAnalysisResponse.json();
      console.log('[DEBUG] Causal analysis generated:', causalAnalysisData);
      setPostmortem(causalAnalysisData.postmortem);

      // Mark as complete
      setGenerationStage('action_items');
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[DEBUG] All sections generated successfully');
    } catch (error) {
      console.error('[ERROR] Error generating postmortem:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate postmortem');
    } finally {
      setGenerating(false);
      setGenerationStage(null);
      console.log('[DEBUG] Generation completed');
    }
  };

  const createEmptyPostmortem = async () => {
    console.log('[DEBUG] Creating empty postmortem record');
    try {
      const response = await fetch(`/api/incidents/${incident.id}/postmortem/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: incident.incidentLead?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ERROR] Create empty postmortem failed:', errorData);
        throw new Error(errorData.error || 'Failed to create postmortem');
      }
      const data = await response.json();
      console.log('[DEBUG] Empty postmortem created successfully:', data);
      setPostmortem(data);
      setHasPostmortem(true);
      return data;
    } catch (error) {
      console.error('[ERROR] Error creating empty postmortem:', error);
      throw error;
    }
  };

  const updateFieldImmediate = async (field: string, value: any) => {
    console.log('[DEBUG] updateField called:', { field, value, hasPostmortem });
    
    setSaving(true);
    try {
      // If no postmortem exists yet, create one first
      if (!postmortem || !hasPostmortem) {
        console.log('[DEBUG] No postmortem exists, creating empty one first');
        await createEmptyPostmortem();
        // After creating, proceed with the update
      }

      // Update existing postmortem
      console.log('[DEBUG] Sending PATCH request for field:', field);
      const response = await fetch(`/api/incidents/${incident.id}/postmortem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ERROR] Update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update postmortem');
      }
      const data = await response.json();
      console.log('[DEBUG] Update successful, received data:', data);
      setPostmortem(data);
    } catch (error) {
      console.error('[ERROR] Error updating postmortem:', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
      console.log('[DEBUG] updateField completed, saving set to false');
    }
  };

  // Debounced version for text inputs
  const updateFieldDebounced = useDebounce(updateFieldImmediate, 1000);

  // Use immediate update for non-text fields, debounced for text fields
  const updateField = (field: string, value: any, immediate: boolean = false) => {
    // Update local state immediately for responsive UI
    // Create a temporary postmortem object if it doesn't exist
    const currentPostmortem = postmortem || {
      id: '',
      incidentId: incident.id,
      businessImpactApplication: '',
      businessImpactStart: '',
      businessImpactEnd: '',
      businessImpactDescription: '',
      businessImpactAffectedCountries: [],
      businessImpactRegulatoryReporting: false,
      businessImpactRegulatoryEntity: '',
      mitigationDescription: '',
      causalAnalysis: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: '',
    };
    
    setPostmortem({ ...currentPostmortem, [field]: value });
    
    // Use appropriate update method
    if (immediate) {
      updateFieldImmediate(field, value);
    } else {
      updateFieldDebounced(field, value);
    }
  };

  const publishPostmortem = async () => {
    await updateFieldImmediate('status', 'published');
  };

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-8 text-center">
        <Loader2 className="w-8 h-8 text-status-info animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading postmortem...</p>
      </div>
    );
  }

  // Show empty state - different behavior based on incident status
  if (!hasPostmortem || !postmortem) {
    const canGenerate = incident.status === 'resolved' || incident.status === 'closed';

    // If incident is not resolved/closed, show simple message
    if (!canGenerate) {
      return (
        <div className="bg-white border border-border rounded-lg p-8">
          <div className="text-center max-w-2xl mx-auto">
            <FileText className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No Postmortem Yet
            </h3>
            <p className="text-text-secondary">
              Postmortem can only be generated after the incident is resolved or closed.
              <br />
              Current status: <span className="font-medium capitalize">{incident.status}</span>
            </p>
          </div>
        </div>
      );
    }

    // If incident is resolved/closed, show full editable form even without postmortem
    // Create empty postmortem object for form
    const emptyPostmortem: Postmortem = postmortem || {
      id: '',
      incidentId: incident.id,
      businessImpactApplication: '',
      businessImpactStart: '',
      businessImpactEnd: '',
      businessImpactDescription: '',
      businessImpactAffectedCountries: [],
      businessImpactRegulatoryReporting: false,
      businessImpactRegulatoryEntity: '',
      mitigationDescription: '',
      causalAnalysis: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: '',
    };

    // Render the full form (same as when postmortem exists)
    return (
      <div className="relative">
        <div className="space-y-6">
          {/* Header with Generate Button */}
          <div className="bg-white border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Postmortem Analysis</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Based on the Swiss cheese model and systemic causal analysis
                </p>
              </div>
              <div className="flex gap-3 items-center">
                {saving && (
                  <div className="text-xs text-text-secondary flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </div>
                )}
                <button
                  onClick={generatePostmortem}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Progressive Generation Indicator in Header */}
            {generating && generationStage && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  {GENERATION_STAGES.map((stage, index) => (
                    <div key={stage.key} className="flex items-center gap-2 flex-1">
                      {generationStage === stage.key ? (
                        <Loader2 className="w-4 h-4 text-accent-purple animate-spin flex-shrink-0" />
                      ) : GENERATION_STAGES.findIndex(s => s.key === stage.key) < GENERATION_STAGES.findIndex(s => s.key === generationStage) ? (
                        <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${
                        generationStage === stage.key ? 'text-accent-purple font-medium' :
                        GENERATION_STAGES.findIndex(s => s.key === stage.key) < GENERATION_STAGES.findIndex(s => s.key === generationStage) ? 'text-status-success' :
                        'text-text-secondary'
                      }`}>
                        {stage.label}
                      </span>
                      {index < GENERATION_STAGES.length - 1 && (
                        <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Business Impact Section */}
          <SectionCard
            title="Business Impact"
            icon={AlertTriangle}
            tooltip={FIELD_TOOLTIPS.businessImpact}
          >
            <div className="space-y-4">
              <InputField
                label="Application"
                value={emptyPostmortem.businessImpactApplication || ''}
                onChange={(value) => updateField('businessImpactApplication', value)}
                placeholder="Which application was impacted?"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <DateTimeField
                  label="Start Time"
                  value={emptyPostmortem.businessImpactStart || ''}
                  onChange={(value) => updateField('businessImpactStart', value, true)}
                />
                <DateTimeField
                  label="End Time"
                  value={emptyPostmortem.businessImpactEnd || ''}
                  onChange={(value) => updateField('businessImpactEnd', value, true)}
                />
              </div>

              {emptyPostmortem.businessImpactStart && emptyPostmortem.businessImpactEnd && (
                <div className="bg-background p-3 rounded border border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-status-info" />
                    <span className="font-medium">Duration:</span>
                    <span>{calculateDuration(emptyPostmortem.businessImpactStart, emptyPostmortem.businessImpactEnd)}</span>
                  </div>
                </div>
              )}

              <TextAreaField
                label="Description"
                value={emptyPostmortem.businessImpactDescription || ''}
                onChange={(value) => updateField('businessImpactDescription', value)}
                placeholder="Describe the business impact in detail..."
                rows={4}
              />

              <MultiSelectField
                label="Affected Countries"
                value={emptyPostmortem.businessImpactAffectedCountries || []}
                onChange={(value) => updateField('businessImpactAffectedCountries', value, true)}
                placeholder="Add countries..."
              />

              <div className="space-y-3">
                <CheckboxField
                  label="Regulatory Reporting Required"
                  checked={emptyPostmortem.businessImpactRegulatoryReporting || false}
                  onChange={(value) => updateField('businessImpactRegulatoryReporting', value, true)}
                />

                {emptyPostmortem.businessImpactRegulatoryReporting && (
                  <InputField
                    label="Regulatory Entity"
                    value={emptyPostmortem.businessImpactRegulatoryEntity || ''}
                    onChange={(value) => updateField('businessImpactRegulatoryEntity', value)}
                    placeholder="e.g., DORA, ECB, etc."
                  />
                )}
              </div>
            </div>
          </SectionCard>

          {/* Mitigation Section */}
          <SectionCard
            title="Mitigation"
            icon={Shield}
            tooltip={FIELD_TOOLTIPS.mitigation}
          >
            <TextAreaField
              label="Mitigation Actions"
              value={emptyPostmortem.mitigationDescription || ''}
              onChange={(value) => updateField('mitigationDescription', value)}
              placeholder="Describe all actions, resilience patterns, or decisions taken to mitigate the incident..."
              rows={6}
            />
          </SectionCard>

          {/* Swiss Cheese Model - Causal Analysis with Action Items */}
          <SectionCard
            title="Systemic Causal Analysis (Swiss Cheese Model)"
            icon={FileText}
            tooltip={FIELD_TOOLTIPS.causalAnalysis}
          >
            <CausalAnalysisEditor
              items={emptyPostmortem.causalAnalysis || []}
              onChange={(value) => updateField('causalAnalysis', value, true)}
              users={users}
            />
          </SectionCard>

          {/* Publish Button - only show if postmortem exists and is not published */}
          {hasPostmortem && emptyPostmortem.status !== 'published' && (
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

        {/* AI Chatbot - only show if postmortem exists */}
        {hasPostmortem && <AIChatbot postmortem={emptyPostmortem} incidentId={incident.id} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-6">
        {/* Header with Generate Button */}
        <div className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Postmortem Analysis</h2>
              <p className="text-sm text-text-secondary mt-1">
                Based on the Swiss cheese model and systemic causal analysis
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {saving && (
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </div>
              )}
              <button
                onClick={generatePostmortem}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Progressive Generation Indicator in Header */}
          {generating && generationStage && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                {GENERATION_STAGES.map((stage, index) => (
                  <div key={stage.key} className="flex items-center gap-2 flex-1">
                    {generationStage === stage.key ? (
                      <Loader2 className="w-4 h-4 text-accent-purple animate-spin flex-shrink-0" />
                    ) : GENERATION_STAGES.findIndex(s => s.key === stage.key) < GENERATION_STAGES.findIndex(s => s.key === generationStage) ? (
                      <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${
                      generationStage === stage.key ? 'text-accent-purple font-medium' :
                      GENERATION_STAGES.findIndex(s => s.key === stage.key) < GENERATION_STAGES.findIndex(s => s.key === generationStage) ? 'text-status-success' :
                      'text-text-secondary'
                    }`}>
                      {stage.label}
                    </span>
                    {index < GENERATION_STAGES.length - 1 && (
                      <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

        {/* Business Impact Section */}
        <SectionCard
          title="Business Impact"
          icon={AlertTriangle}
          tooltip={FIELD_TOOLTIPS.businessImpact}
        >
          <div className="space-y-4">
            <InputField
              label="Application"
              value={postmortem.businessImpactApplication || ''}
              onChange={(value) => updateField('businessImpactApplication', value)}
              placeholder="Which application was impacted?"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <DateTimeField
                label="Start Time"
                value={postmortem.businessImpactStart || ''}
                onChange={(value) => updateField('businessImpactStart', value, true)}
              />
              <DateTimeField
                label="End Time"
                value={postmortem.businessImpactEnd || ''}
                onChange={(value) => updateField('businessImpactEnd', value, true)}
              />
            </div>

            {postmortem.businessImpactStart && postmortem.businessImpactEnd && (
              <div className="bg-background p-3 rounded border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-status-info" />
                  <span className="font-medium">Duration:</span>
                  <span>{calculateDuration(postmortem.businessImpactStart, postmortem.businessImpactEnd)}</span>
                </div>
              </div>
            )}

            <TextAreaField
              label="Description"
              value={postmortem.businessImpactDescription || ''}
              onChange={(value) => updateField('businessImpactDescription', value)}
              placeholder="Describe the business impact in detail..."
              rows={4}
            />

            <MultiSelectField
              label="Affected Countries"
              value={postmortem.businessImpactAffectedCountries || []}
              onChange={(value) => updateField('businessImpactAffectedCountries', value, true)}
              placeholder="Add countries..."
            />

            <div className="space-y-3">
              <CheckboxField
                label="Regulatory Reporting Required"
                checked={postmortem.businessImpactRegulatoryReporting || false}
                onChange={(value) => updateField('businessImpactRegulatoryReporting', value, true)}
              />

              {postmortem.businessImpactRegulatoryReporting && (
                <InputField
                  label="Regulatory Entity"
                  value={postmortem.businessImpactRegulatoryEntity || ''}
                  onChange={(value) => updateField('businessImpactRegulatoryEntity', value)}
                  placeholder="e.g., DORA, ECB, etc."
                />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Mitigation Section */}
        <SectionCard
          title="Mitigation"
          icon={Shield}
          tooltip={FIELD_TOOLTIPS.mitigation}
        >
          <TextAreaField
            label="Mitigation Actions"
            value={postmortem.mitigationDescription || ''}
            onChange={(value) => updateField('mitigationDescription', value)}
            placeholder="Describe all actions, resilience patterns, or decisions taken to mitigate the incident..."
            rows={6}
          />
        </SectionCard>

        {/* Swiss Cheese Model - Causal Analysis with Action Items */}
        <SectionCard
          title="Systemic Causal Analysis (Swiss Cheese Model)"
          icon={FileText}
          tooltip={FIELD_TOOLTIPS.causalAnalysis}
        >
          <CausalAnalysisEditor
            items={postmortem.causalAnalysis || []}
            onChange={(value) => updateField('causalAnalysis', value, true)}
            users={users}
          />
        </SectionCard>

        {/* Publish Button */}
        {postmortem.status !== 'published' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-4 py-2 bg-status-success text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Publish Postmortem
            </button>
          </div>
        )}
      </div>

      {/* AI Chatbot */}
      <AIChatbot postmortem={postmortem} incidentId={incident.id} />

      {/* Publish Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={publishPostmortem}
        title="Publish Postmortem"
        message="Are you sure you want to publish this postmortem? Once published, it will be marked as final and shared with the team. This action will also generate knowledge graph embeddings for AI-powered recommendations."
        confirmText="Publish"
        cancelText="Cancel"
        confirmButtonClass="bg-status-success hover:bg-green-600"
      />
    </div>
  );
}
