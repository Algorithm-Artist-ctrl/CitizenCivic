import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  PlusCircle,
  MapPin,
  Flame,
  Layers,
  ArrowRight,
  LayoutGrid,
  List,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import Button from '../components/ui/Button';
import type { Case, Category, PaginatedResponse } from '../types';

export const CaseListPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active scope tab: 'mine' or 'all'
  const activeScope = searchParams.get('scope') || (user?.role === 'CITIZEN' ? 'mine' : 'all');

  const [cases, setCases] = useState<Case[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchCases();
  }, [selectedStatus, selectedCategory, activeScope]);

  const loadCategories = async () => {
    try {
      const res = await apiClient.get('/areas/categories/').catch(() => ({ data: { results: [] } }));
      setCategories(res.data.results || res.data || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      let url = '/cases/?';
      if (activeScope === 'mine') url += 'scope=mine&';
      if (selectedStatus) url += `status=${selectedStatus}&`;
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await apiClient.get<PaginatedResponse<Case>>(url);
      setCases(res.data.results || []);
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (scope: 'mine' | 'all') => {
    const newParams = new URLSearchParams(searchParams);
    if (scope === 'mine') {
      newParams.set('scope', 'mine');
    } else {
      newParams.delete('scope');
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const handleResetFilters = () => {
    setSelectedStatus('');
    setSelectedCategory('');
    setSearchQuery('');
  };

  const statuses = [
    'SUBMITTED',
    'REVIEWED',
    'FORWARDED',
    'ACKNOWLEDGED',
    'IN_PROGRESS',
    'RESOLUTION_REPORTED',
    'VERIFICATION_PENDING',
    'VERIFIED_RESOLVED',
    'DISPUTED_CLOSURE',
    'REOPENED',
    'ESCALATED',
    'REJECTED',
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span className="font-bold text-slate-900">{t('cases.publicRegistry') || 'PUBLIC REGISTRY'}</span>
            <span>·</span>
            <span>{t('cases.directorySubtitle') || 'PUBLIC CIVIC DIRECTORY'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 mt-1 font-heading">
            {activeScope === 'mine'
              ? (t('cases.myReportsTab') || 'My Reported Cases')
              : (t('cases.title') || 'Civic Resolution Directory')}
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {t('cases.subtitle') || 'Transparent public ledger of reported municipal issues, operational dispatch states, and photographic resolution evidence.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Toggle for logged-in citizens */}
          {user && (
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleScopeChange('mine')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  activeScope === 'mine'
                    ? 'bg-white text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('cases.myReportsTab') || 'My Reports'}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  activeScope !== 'mine'
                    ? 'bg-white text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('cases.allPublicTab') || 'All Public Cases'}
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="hidden sm:flex rounded-md border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card view"
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {user?.role === 'CITIZEN' && (
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t('cases.reportIssue') || 'Report Issue'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('cases.searchPlaceholder') || 'Search by case #, landmark, or description...'}
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden cursor-pointer"
          >
            <option value="">{t('cases.allStatuses') || 'All Statuses'} ({cases.length})</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {t(`case.status.${st}`) || st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-2 px-3 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden cursor-pointer"
          >
            <option value="">{t('cases.allCategories') || 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {i18n.language === 'hi' ? (c.name_hi || c.name_en) : c.name_en}
              </option>
            ))}
          </select>

          <Button type="submit" variant="primary" size="md">
            {t('common.filter') || 'Filter'}
          </Button>

          {(selectedStatus || selectedCategory || searchQuery) && (
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={handleResetFilters}
              icon={<RotateCcw className="h-3 w-3" />}
            >
              {t('cases.resetFilters') || 'Reset'}
            </Button>
          )}
        </form>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        </div>
      ) : cases.length === 0 ? (
        /* Empty Results State */
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <Layers className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            {t('cases.noCasesFound') || 'No matching cases found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {selectedStatus || selectedCategory || searchQuery
              ? (t('cases.noCasesDesc') || 'Try adjusting your search criteria or resetting the active filters above.')
              : 'There are currently no recorded cases in this jurisdiction.'}
          </p>
          {(selectedStatus || selectedCategory || searchQuery) && (
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
              {t('cases.resetFilters') || 'Clear Active Filters'}
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* High-Density GovTech Table View */
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('cases.table.caseNumber') || 'Case Reference'}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('cases.table.category') || 'Category'}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('cases.table.landmark') || 'Landmark / Grid'}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('cases.table.status') || 'Status'}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('cases.table.evidence') || 'Evidence'}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">{t('cases.table.action') || 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-950">{c.case_number}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-900">
                        {i18n.language === 'hi' ? (c.category?.name_hi || c.category?.name_en) : (c.category?.name_en || 'General')}
                      </span>
                      {c.is_hotspot && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                          <Flame className="h-2.5 w-2.5" />
                          <span>{t('dashboard.hotspot') || 'Hotspot'}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate">
                      <span className="text-slate-700">{c.landmark}</span>
                      <div className="text-[10px] font-mono text-slate-400">
                        {c.latitude?.toFixed(4)}° N, {c.longitude?.toFixed(4)}° E
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <CaseStatusBadge status={c.status} size="xs" />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {c.evidence?.length || 0} photo(s)
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors inline-flex items-center gap-1"
                      >
                        <span>{t('dashboard.reviewDetails') || 'Audit Case'}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-950">{c.case_number}</span>
                  <CaseStatusBadge status={c.status} size="xs" />
                </div>

                <div className="text-xs font-bold text-slate-800">
                  {i18n.language === 'hi' ? (c.category?.name_hi || c.category?.name_en) : c.category?.name_en}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 truncate max-w-[65%]">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{c.landmark}</span>
                </span>
                <Link
                  to={`/cases/${c.id}`}
                  className="font-semibold text-slate-900 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  <span>{t('dashboard.reviewDetails') || 'Review'} &rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
