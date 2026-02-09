'use client';

import { useState, useEffect } from 'react';
import { Users, UserCheck, MessageSquare, Bell, ChevronDown, ChevronUp } from 'lucide-react';

type RACIRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

type RACIEntry = {
  role: RACIRole;
  type: 'user' | 'group';
  name: string;
  email?: string;
  title?: string;
  description?: string;
  sys_id: string;
};

interface RACIMatrixProps {
  incidentId: string;
}

const roleConfig = {
  responsible: {
    icon: UserCheck,
    label: 'Responsible',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Managers from Network CAB Managers Group',
  },
  accountable: {
    icon: Users,
    label: 'Accountable',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Assignment Groups',
  },
  consulted: {
    icon: MessageSquare,
    label: 'Consulted',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Assignment Groups (Consulted)',
  },
  informed: {
    icon: Bell,
    label: 'Informed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Users from Product Management Group',
  },
};

export function RACIMatrix({ incidentId }: RACIMatrixProps) {
  const [raciData, setRaciData] = useState<Record<RACIRole, RACIEntry[]>>({
    responsible: [],
    accountable: [],
    consulted: [],
    informed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<RACIRole, boolean>>({
    responsible: false,
    accountable: false,
    consulted: false,
    informed: false,
  });

  useEffect(() => {
    fetchRACIData();
  }, [incidentId]);

  const fetchRACIData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch Responsible: Try Network CAB Managers Group, fallback to all assignment groups
      let responsibleData = [];
      try {
        const responsibleResponse = await fetch(
          'http://localhost:3001/api/servicenow/groups/Network CAB Managers/members'
        );
        if (responsibleResponse.ok) {
          responsibleData = await responsibleResponse.json();
        }
      } catch (err) {
        console.warn('Network CAB Managers group not found, using fallback');
      }

      // If no managers found, fetch from assignment groups as fallback
      if (responsibleData.length === 0) {
        const fallbackResponse = await fetch(
          'http://localhost:3001/api/servicenow/assignment-groups?limit=5'
        );
        if (fallbackResponse.ok) {
          const groups = await fallbackResponse.json();
          responsibleData = groups.slice(0, 3);
        }
      }

      // Fetch Accountable: Assignment Groups (top 3)
      const accountableResponse = await fetch(
        'http://localhost:3001/api/servicenow/assignment-groups?limit=50'
      );
      const accountableData = accountableResponse.ok ? await accountableResponse.json() : [];

      // Fetch Consulted: Assignment Groups (different set, top 3)
      const consultedResponse = await fetch(
        'http://localhost:3001/api/servicenow/assignment-groups?limit=50'
      );
      const consultedRaw = consultedResponse.ok ? await consultedResponse.json() : [];

      // Fetch Informed: Try Product Management Group, fallback to general user search
      let informedData = [];
      try {
        const informedResponse = await fetch(
          'http://localhost:3001/api/servicenow/groups/Product Management/members'
        );
        if (informedResponse.ok) {
          informedData = await informedResponse.json();
        }
      } catch (err) {
        console.warn('Product Management group not found, using fallback');
      }

      // If no users found, search for active users as fallback
      if (informedData.length === 0) {
        try {
          const fallbackResponse = await fetch(
            'http://localhost:3001/api/servicenow/users/search?q=admin&limit=10'
          );
          if (fallbackResponse.ok) {
            informedData = await fallbackResponse.json();
          }
        } catch (err) {
          console.warn('Could not fetch fallback users');
        }
      }

      // Helper function to get diverse top 3 entries
      const getTop3Diverse = (items: any[], isGroup: boolean) => {
        if (items.length <= 3) return items;
        
        // Try to get at least one from different categories if possible
        const result: any[] = [];
        const seen = new Set<string>();
        
        // First pass: get unique entries
        for (const item of items) {
          if (result.length >= 3) break;
          const key = isGroup ? item.name : item.email;
          if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
          }
        }
        
        return result;
      };

      setRaciData({
        responsible: getTop3Diverse(
          responsibleData.map((item: any) => ({
            role: 'responsible',
            type: item.email ? 'user' : 'group',
            name: item.name,
            email: item.email,
            title: item.title,
            description: item.description,
            sys_id: item.sys_id,
          })),
          false
        ),
        accountable: getTop3Diverse(
          accountableData.map((group: any) => ({
            role: 'accountable',
            type: 'group',
            name: group.name,
            description: group.description,
            sys_id: group.sys_id,
          })),
          true
        ),
        consulted: getTop3Diverse(
          consultedRaw.slice(3, 50).map((group: any) => ({
            role: 'consulted',
            type: 'group',
            name: group.name,
            description: group.description,
            sys_id: group.sys_id,
          })),
          true
        ),
        informed: getTop3Diverse(
          informedData.map((user: any) => ({
            role: 'informed',
            type: 'user',
            name: user.name,
            email: user.email,
            title: user.title,
            sys_id: user.sys_id,
          })),
          false
        ),
      });
    } catch (err) {
      console.error('Error fetching RACI data:', err);
      setError('Failed to load RACI matrix data from ServiceNow');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (role: RACIRole) => {
    setExpandedSections(prev => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          RACI Matrix
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-status-info"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          RACI Matrix
        </h3>
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchRACIData}
            className="mt-4 px-4 py-2 bg-status-info text-white text-sm rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          RACI Matrix
        </h3>
        <span className="text-xs text-text-secondary">
          From ServiceNow
        </span>
      </div>

      <div className="space-y-4">
        {(Object.keys(roleConfig) as RACIRole[]).map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const entries = raciData[role];
          const isExpanded = expandedSections[role];

          return (
            <div
              key={role}
              className={`border ${config.borderColor} rounded-lg overflow-hidden`}
            >
              <button
                onClick={() => toggleSection(role)}
                className={`w-full ${config.bgColor} px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <div className="text-left">
                    <div className="font-semibold text-sm text-text-primary">
                      {config.label}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {config.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className={`w-4 h-4 ${config.color}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 ${config.color}`} />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 bg-white">
                  {entries.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">
                      No entries found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((entry, index) => (
                        <div
                          key={`${entry.sys_id}-${index}`}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-background transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                            {entry.type === 'user' ? (
                              <span className={`text-sm font-medium ${config.color}`}>
                                {entry.name.charAt(0).toUpperCase()}
                              </span>
                            ) : (
                              <Users className={`w-4 h-4 ${config.color}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-text-primary">
                              {entry.name}
                            </div>
                            {entry.email && (
                              <div className="text-xs text-text-secondary">
                                {entry.email}
                              </div>
                            )}
                            {entry.title && (
                              <div className="text-xs text-text-secondary">
                                {entry.title}
                              </div>
                            )}
                            {entry.description && (
                              <div className="text-xs text-text-secondary mt-1">
                                {entry.description}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${config.bgColor} ${config.color} font-medium`}>
                            {entry.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-text-secondary">
          <p className="font-semibold mb-2">RACI Legend:</p>
          <ul className="space-y-1 ml-4">
            <li><strong>Responsible:</strong> Those who do the work to complete the task</li>
            <li><strong>Accountable:</strong> The one ultimately answerable for the correct completion</li>
            <li><strong>Consulted:</strong> Those whose opinions are sought</li>
            <li><strong>Informed:</strong> Those who are kept up-to-date on progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
