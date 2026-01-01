'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, FileText, ChevronRight, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { fetchAnalysisHistory } from '@/lib/supabase';
import { useAnalysisStore } from '@/lib/store';
import { AnalysisHistoryItem } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const { setAnalysis } = useAnalysisStore();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchAnalysisHistory();
      if (fetchError) throw fetchError;
      setHistory((data as any) || []);
    } catch (err: any) {
      console.error('Error loading history:', err);
      setError(err.message || 'Failed to load analysis history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSelect = (item: AnalysisHistoryItem) => {
    // If the item has the full analysis data, hydrate the store
    if (item.analysis_data) {
      setAnalysis(item.analysis_data);
    }
    // Navigate to the report page
    router.push(`/report/${item.id}/metrics`);
  };

  const filteredHistory = history.filter((item) =>
    (item.title || 'Untitled Script').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <History className="w-6 h-6 text-amber-500" /> History
        </h1>
        <p className="text-slate-400">Your saved analyses</p>
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search analyses..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-4 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-3 top-3.5 text-slate-500 w-4 h-4" />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
          <p className="text-slate-400">Loading your history...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No analyses yet</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery ? "No results match your search." : "You haven't run any script analysis yet."}
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Start New Analysis
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="group cursor-pointer hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-medium text-white group-hover:text-amber-400 transition-colors">
                        {item.title || 'Untitled Script'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {item.format || 'Standard'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-mono">
                        {item.overall_score != null ? Math.round(item.overall_score) : '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-sm">
                      {formatDate(item.created_at || item.timestamp)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-500 transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 active:bg-slate-800 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-white">{item.title || 'Untitled Script'}</h3>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs">
                    {item.format || 'Standard'}
                  </span>
                  <span className="text-slate-400">
                    Score: <span className="text-white">{item.overall_score != null ? Math.round(item.overall_score) : '—'}</span>
                  </span>
                  <span className="text-slate-500 ml-auto">{formatDate(item.created_at || item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
