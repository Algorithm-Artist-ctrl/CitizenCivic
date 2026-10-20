import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Landmark,
  Search,
  ExternalLink,
  ShieldCheck,
  FileText,
  X,
  Scale,
  Award,
  Database,
  ArrowRight,
} from 'lucide-react';
import apiClient from '../api/client';
import type {
  MunicipalState,
  MunicipalULB,
  MunicipalObservation,
  MunicipalDataSource,
  MunicipalMetric,
} from '../types';

export const MunicipalExplorerPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [states, setStates] = useState<MunicipalState[]>([]);
  const [ulbs, setUlbs] = useState<MunicipalULB[]>([]);
  const [sources, setSources] = useState<MunicipalDataSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const selectedState = searchParams.get('state') || '';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'revenue';

  // Modal Dossier
  const [selectedUlbId, setSelectedUlbId] = useState<string | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<{
    ulb: MunicipalULB;
    observations: MunicipalObservation[];
    metrics: MunicipalMetric[];
  } | null>(null);

  // Comparison State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<any[]>([]);

  // Source Registry Modal
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  // Load States & Sources once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [statesRes, sourcesRes] = await Promise.all([
          apiClient.get('/municipal/states').catch(() => ({ data: { states: [] } })),
          apiClient.get('/municipal/sources').catch(() => ({ data: { sources: [] } })),
        ]);
        setStates(statesRes.data?.states || []);
        setSources(sourcesRes.data?.sources || []);
      } catch (err) {
        console.error('Failed to load municipal metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch ULBs on filter/search change
  useEffect(() => {
    const fetchUlbs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedState) params.append('state', selectedState);
        if (searchQuery) params.append('search', searchQuery);
        const serverSort = sortBy === 'population' ? 'population_desc'
          : sortBy === 'swachh' ? 'swachh_rank_asc'
          : sortBy === 'per_capita' ? 'per_capita_desc'
          : 'revenue_desc';
        params.append('sort_by', serverSort);

        const res = await apiClient.get(`/municipal/ulbs?${params.toString()}`);
        setUlbs(res.data?.ulbs || []);
      } catch (err) {
        console.error('Failed to load ULBs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUlbs();
  }, [selectedState, searchQuery, sortBy]);

  // Load Dossier when selectedUlbId changes
  useEffect(() => {
    if (!selectedUlbId) {
      setDossierData(null);
      return;
    }

    const fetchDossier = async () => {
      setDossierLoading(true);
      try {
        const res = await apiClient.get(`/municipal/ulbs/${selectedUlbId}`);
        setDossierData(res.data);
      } catch (err) {
        console.error('Failed to load ULB dossier', err);
      } finally {
        setDossierLoading(false);
      }
    };

    fetchDossier();
  }, [selectedUlbId]);

  // Handle Comparison View
  const handleOpenCompare = async () => {
    if (compareIds.length < 2) return;
    setCompareLoading(true);
    setCompareModalOpen(true);
    try {
      const res = await apiClient.get(`/municipal/compare?ids=${compareIds.join(',')}`);
      setCompareData(res.data?.comparison || []);
    } catch (err) {
      console.error('Failed to compare ULBs', err);
    } finally {
      setCompareLoading(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const formatCr = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
  };

  const formatPerCapita = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  const isHindi = i18n.language === 'hi';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
            <Landmark className="h-4 w-4" />
            <span>{isHindi ? 'नगर निकाय डेटा निर्देशिका' : 'Municipal Data Directory'}</span>
            <span>·</span>
            <span className="text-slate-500">
              {isHindi ? 'उपलब्ध होने पर स्रोत विवरण दिखाया जाता है' : 'Source details shown where available'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 mt-1 font-heading">
            {isHindi ? 'शहरी स्थानीय निकाय एवं नगर निगम प्रदर्शन' : 'Municipal Corporation Benchmark & Dossiers'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            {isHindi
              ? 'वर्तमान डेटासेट में उपलब्ध नगर निकाय रिकॉर्ड देखें। प्रत्येक आंकड़े की रिपोर्टिंग अवधि, स्रोत और डेटा गुणवत्ता स्थिति जांचें; अनुपलब्ध जानकारी को अनुपलब्ध ही दिखाया जाता है।'
              : 'Browse municipal records currently available in the dataset. Check each value’s reporting period, source, and data-quality status; missing values remain unavailable.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSourcesModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isHindi ? 'डेटा स्रोत एवं लाइसेंस' : 'Official Sources & Provenance'}</span>
          </button>

          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={handleOpenCompare}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors cursor-pointer animate-pulse"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>{isHindi ? `तुलना करें (${compareIds.length})` : `Compare Selected (${compareIds.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Source status comes from the configured registry, not a fixed claim. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            {sources.length > 0
              ? (isHindi
                ? `${sources.length} डेटा स्रोत कॉन्फ़िगर हैं। उपयोग करने से पहले प्रत्येक रिकॉर्ड का स्रोत और गुणवत्ता स्थिति देखें।`
                : `${sources.length} data source(s) are configured. Review each record’s provenance and quality status before relying on a metric.`)
              : (isHindi
                ? 'अभी कोई डेटा स्रोत कॉन्फ़िगर नहीं है। स्रोत सहित डेटा आयात होने तक नगर निकाय आंकड़े उपलब्ध नहीं होंगे।'
                : 'No municipal data sources are configured yet. Municipal figures remain unavailable until sourced records are imported.')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 shrink-0">
          <span>{isHindi ? `${ulbs.length} निकाय उपलब्ध` : `${ulbs.length} municipal bodies available`}</span>
          <span>•</span>
          <span>{isHindi ? 'रिकॉर्ड-स्तरीय स्रोत जांचें' : 'Check per-record provenance'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={isHindi ? 'नगर निगम का नाम या मुख्यालय खोजें...' : 'Search by corporation name, code or headquarters...'}
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden transition-colors"
            />
          </div>

          {/* State Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={selectedState}
              onChange={(e) => updateParam('state', e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-hidden transition-colors font-medium cursor-pointer"
            >
              <option value="">{isHindi ? 'सभी राज्य एवं केंद्र शासित प्रदेश' : 'All States & Union Territories'}</option>
              {states.map((st) => (
                <option key={st.code} value={st.code}>
                  {isHindi ? (st.name_hi || st.name) : st.name} ({st.code}) — {st.ulb_count || 1} ULBs
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-hidden transition-colors font-medium cursor-pointer"
            >
              <option value="revenue">{isHindi ? 'क्रमबद्ध: कुल आय' : 'Sort: Highest Revenue'}</option>
              <option value="population">{isHindi ? 'क्रमबद्ध: जनसंख्या (2011)' : 'Sort: Population'}</option>
              <option value="swachh">{isHindi ? 'क्रमबद्ध: स्वच्छ सर्वेक्षण रैंक' : 'Sort: Cleanliness Rank'}</option>
              <option value="per_capita">{isHindi ? 'क्रमबद्ध: प्रति व्यक्ति व्यय' : 'Sort: Per Capita Spend'}</option>
            </select>
          </div>
        </div>

        {/* Selected Comparison Counter */}
        {compareIds.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600">
              {isHindi ? `${compareIds.length} नगर निगम तुलना हेतु चयनित` : `${compareIds.length} corporation(s) selected for comparison (Max 4)`}
            </span>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              {isHindi ? 'चयन साफ़ करें' : 'Clear selection'}
            </button>
          </div>
        )}
      </div>

      {/* Corporation Grid Cards */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <span className="text-xs text-slate-500 font-mono">Retrieving official municipal dossiers...</span>
        </div>
      ) : ulbs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <Building2 className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 font-heading">
            {isHindi ? 'कोई नगर निगम नहीं मिला' : 'No Municipal Corporations matched your search'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or clearing the state filter.
          </p>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
          >
            {isHindi ? 'फ़िल्टर हटाएं' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ulbs.map((ulb) => {
            const isComparing = compareIds.includes(ulb.id);
            return (
              <div
                key={ulb.id}
                className={`rounded-xl border bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isComparing ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                {/* Header: Name, State, Code */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                        {ulb.code} • {isHindi ? (ulb.state_name_hi || ulb.state_name) : ulb.state_name}
                      </span>
                      <h3 className="text-base font-bold text-slate-950 mt-1 font-heading">
                        {isHindi ? (ulb.name_hi || ulb.name) : ulb.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        HQ: {ulb.headquarters} · {ulb.ulb_type}
                      </p>
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isComparing}
                        onChange={() => toggleCompare(ulb.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span>{isHindi ? 'तुलना' : 'Compare'}</span>
                    </label>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50/70 p-2.5 rounded-lg space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        {isHindi ? 'ऑडिटेड आय' : 'Audited Revenue'}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-950 block">
                        {formatCr(ulb.total_revenue_cr)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isHindi ? 'स्वयं का स्रोत' : 'Own-Source'}: {formatCr(ulb.own_source_revenue_cr)}
                      </span>
                    </div>

                    <div className="bg-slate-50/70 p-2.5 rounded-lg space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        {isHindi ? 'प्रति व्यक्ति व्यय' : 'Per Capita Spend'}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-950 block">
                        {formatPerCapita(ulb.per_capita_expenditure)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isHindi ? 'कुल' : 'Total'}: {formatCr(ulb.total_expenditure_cr)}
                      </span>
                    </div>
                  </div>

                  {/* Swachh Survekshan & Sanitation Badge Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ulb.swachh_rank ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                        <Award className="h-3 w-3 text-amber-600" />
                        <span>Swachh Rank #{ulb.swachh_rank}</span>
                      </span>
                    ) : null}

                    {ulb.gfc_stars && (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        GFC: {ulb.gfc_stars}
                      </span>
                    )}

                    {ulb.odf_status && (
                      <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        ODF: {ulb.odf_status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    Pop: {Number(ulb.population_census_2011).toLocaleString('en-IN')} (2011)
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedUlbId(ulb.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{isHindi ? 'पूर्ण विवरण देखें' : 'View Full Dossier'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Municipal Dossier */}
      {selectedUlbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
                  <Building2 className="h-4 w-4" />
                  <span>Official Municipal Dossier</span>
                  <span>•</span>
                  <span>{dossierData?.ulb.code}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1 font-heading">
                  {isHindi
                    ? (dossierData?.ulb.name_hi || dossierData?.ulb.name)
                    : dossierData?.ulb.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  State: {dossierData?.ulb.state_name} · Headquarters: {dossierData?.ulb.headquarters}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUlbId(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {dossierLoading || !dossierData ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span className="text-xs text-slate-500 font-mono">Loading audited indicators & citations...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ULB Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Population (2011)</span>
                    <span className="text-sm font-bold font-mono text-slate-950 block">
                      {Number(dossierData.ulb.population_census_2011).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">Census of India</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Municipal Area</span>
                    <span className="text-sm font-bold font-mono text-slate-950 block">
                      {dossierData.ulb.area_sq_km} sq km
                    </span>
                    <span className="text-[10px] text-slate-400">Notified Boundary</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Swachh Rank</span>
                    <span className="text-sm font-bold font-mono text-amber-700 block">
                      {dossierData.ulb.swachh_rank ? `#${dossierData.ulb.swachh_rank}` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">Score: {dossierData.ulb.swachh_score || '—'} / 9500</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Official Portal</span>
                    <a
                      href={dossierData.ulb.official_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>Visit Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-[10px] text-slate-400">Verified domain</span>
                  </div>
                </div>

                {/* Standardized Observations Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-700" />
                      <span>Standardized Indicators & Provenance</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {dossierData.observations.length} Verified Observations
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {dossierData.observations.map((obs) => (
                      <div key={obs.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {obs.metric_category}
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-heading">
                              {isHindi ? (obs.metric_name_hi || obs.metric_name) : obs.metric_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-slate-500">Period: {obs.reporting_period}</span>
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                              {obs.value_numeric !== null
                                ? `${obs.value_numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${obs.unit}`
                                : (obs.value_text || '—')}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {obs.metric_definition}
                        </p>

                        {/* Citation & Provenance Link */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Publisher:</span>
                            <span className="font-semibold text-slate-700">{obs.source_publisher}</span>
                            <span>•</span>
                            <span className="truncate max-w-xs">{obs.source_dataset_title}</span>
                          </div>

                          <a
                            href={obs.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                          >
                            <span>Inspect Official Source</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Side-by-Side Comparison */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
                  <Scale className="h-4 w-4" />
                  <span>Municipal Corporation Benchmarking</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1 font-heading">
                  Side-by-Side Performance Comparison
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparing audited revenue, outlay, and cleanliness benchmarks across {compareData.length} corporations.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close comparison"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {compareLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <span className="text-xs text-slate-500 font-mono">Aligning comparative matrix...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="p-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider">Indicator / Benchmark</th>
                      {compareData.map((item) => (
                        <th key={item.ulb.id} className="p-3 font-bold text-slate-900 font-heading min-w-[180px]">
                          <div>{item.ulb.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal font-mono">{item.ulb.code} · {item.ulb.state_code}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Audited Total Revenue</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 font-bold text-slate-900">
                          {formatCr(item.metrics?.REVENUE_TOTAL?.value_numeric)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Own-Source Revenue</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 text-slate-800">
                          {formatCr(item.metrics?.REVENUE_OWN_SOURCE?.value_numeric)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Audited Total Expenditure</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 text-slate-800">
                          {formatCr(item.metrics?.EXPENDITURE_TOTAL?.value_numeric)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Per-Capita Civic Spend</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 font-bold text-emerald-800 bg-emerald-50/40">
                          {formatPerCapita(item.metrics?.PER_CAPITA_EXPENDITURE?.value_numeric)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Swachh Survekshan Rank</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 font-bold text-amber-800">
                          {item.metrics?.SWACHH_SURVEKSHAN_RANK?.value_numeric
                            ? `#${item.metrics.SWACHH_SURVEKSHAN_RANK.value_numeric}`
                            : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Garbage Free City (GFC)</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 text-slate-800">
                          {item.metrics?.GFC_STAR_RATING?.value_text || '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">ODF Sanitation Status</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 text-slate-800">
                          {item.metrics?.ODF_STATUS?.value_text || '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700 font-sans">Population (Census 2011)</td>
                      {compareData.map((item) => (
                        <td key={item.ulb.id} className="p-3 text-slate-600">
                          {Number(item.ulb.population_census_2011).toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Official Source Registry */}
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700">
                  <Database className="h-4 w-4" />
                  <span>Official Provenance & Open Data Registry</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1 font-heading">
                  Official Data Sources & Licensure
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  CitizenCivic strictly utilizes legally accessible, publicly disclosed municipal datasets.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSourcesModalOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close sources modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {sources.map((src) => (
                <div key={src.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 font-heading">
                      {src.publisher}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      {src.license}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">{src.dataset_title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{src.documentation}</p>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Retrieved: {new Date(src.retrieved_at).toLocaleDateString()}</span>
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MunicipalExplorerPage;
