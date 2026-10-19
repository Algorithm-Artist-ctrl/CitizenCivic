import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  PlusCircle,
  MapPin,
  Clock,
  Flame,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import CaseStatusBadge from '../components/CaseStatusBadge';
import type { Case, Category, PaginatedResponse } from '../types';

export const CaseListPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [cases, setCases] = useState<Case[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    fetchCases();
  }, [selectedStatus, selectedCategory]);

  const loadCategories = async () => {
    try {
      const res = await apiClient.get('/areas/categories/');
      setCategories(res.data.results || res.data);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      let url = '/cases/?';
      if (selectedStatus) url += `status=${selectedStatus}&`;
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await apiClient.get<PaginatedResponse<Case>>(url);
      setCases(res.data.results || []);
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {user?.role === 'CITIZEN' ? t('cases.myCases', 'My Cases') : t('cases.allCases', 'All Cases Directory')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time track record of reported garbage hotspots and verifiable resolution milestones.
          </p>
        </div>

        {user?.role === 'CITIZEN' && (
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Report New Issue</span>
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case Number (e.g. CC-20261019-...) or landmark..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-700 bg-slate-50 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="FORWARDED">Forwarded</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
            <option value="VERIFIED_RESOLVED">Verified Resolved</option>
            <option value="DISPUTED_CLOSURE">Disputed Closure</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-700 bg-slate-50 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_en}
              </option>
            ))}
          </select>

          {(selectedStatus || selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus('');
                setSelectedCategory('');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900">{t('cases.noCases', 'No cases found')}</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {t('cases.noCasesMessage', "No issues match your current filters or you haven't reported any yet.")}
          </p>
          {user?.role === 'CITIZEN' && (
            <Link
              to="/report"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t('cases.reportFirst', 'Report your first issue')}</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {c.case_number}
                  </span>
                  <CaseStatusBadge status={c.status} size="sm" />
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {(c as any).category_name || c.category?.name_en || 'Waste Issue'}
                  </span>
                  {c.is_hotspot && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                      <Flame className="h-3 w-3" /> Hotspot
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-xs text-slate-700 font-medium line-clamp-3">
                  {c.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{c.landmark || 'Indiranagar'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
