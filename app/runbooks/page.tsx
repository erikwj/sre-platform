'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, Plus, Clock } from "lucide-react";

interface Runbook {
  id: string;
  serviceName: string;
  teamName: string;
  description: string;
  updatedAt: string;
}

export default function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [filteredRunbooks, setFilteredRunbooks] = useState<Runbook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRunbooks();
  }, []);

  useEffect(() => {
    filterRunbooks();
  }, [searchQuery, selectedTeam, runbooks]);

  const fetchRunbooks = async () => {
    try {
      const response = await fetch('/api/runbooks');
      if (response.ok) {
        const data = await response.json();
        setRunbooks(data);
        setFilteredRunbooks(data);
      }
    } catch (error) {
      console.error('Error fetching runbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRunbooks = () => {
    let filtered = runbooks;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(runbook =>
        runbook.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        runbook.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        runbook.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by team
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(runbook => runbook.teamName === selectedTeam);
    }

    setFilteredRunbooks(filtered);
  };

  const teams = ['all', ...Array.from(new Set(runbooks.map(r => r.teamName)))];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
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
                  href="/runbooks" 
                  className="text-sm font-semibold text-gray-900"
                >
                  Runbooks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Service Runbooks</h1>
          <Link
            href="/runbooks/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Runbook
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search services, teams, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {teams.map(team => (
                <option key={team} value={team}>
                  {team === 'all' ? 'All Teams' : team}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Runbooks List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">Loading runbooks...</p>
          </div>
        ) : filteredRunbooks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">
              {searchQuery || selectedTeam !== 'all' 
                ? 'No runbooks match your search criteria.' 
                : 'No runbooks yet. Create your first service runbook to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRunbooks.map((runbook) => (
              <Link
                key={runbook.id}
                href={`/runbooks/${runbook.id}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {runbook.serviceName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {runbook.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                        {runbook.teamName}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Updated {formatDate(runbook.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
