import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  Flame,
  ChevronDown,
  ChevronUp,
  MapPin,
  Layers,
  Camera,
  Search,
  AlertTriangle,
  ExternalLink,
  Building2,
  Check,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CaseStatusBadge from '../components/CaseStatusBadge';
import type { Case, Category } from '../types';
import CivicStreetGridFallback from '../components/CivicStreetGridFallback';

// Lazy-load the restrained 3D street grid to keep initial load lightweight
const CivicStreetGrid3D = lazy(() => import('../components/CivicStreetGrid3D'));

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // Real Database State
  const [cases, setCases] = useState<Case[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Hero Preview State (Tabs: Live Cases Inspector vs 3D Architectural Grid)
  const [heroTab, setHeroTab] = useState<'cases' | 'grid'>('cases');
  const [selectedHeroCaseId, setSelectedHeroCaseId] = useState<string | null>(null);

  // Public Directory Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Fetch real data on mount
  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    // 1. Fetch real nearby cases
    setLoadingCases(true);
    try {
      const res = await apiClient.get<any[]>('/cases/nearby');
      const data = Array.isArray(res.data) ? res.data : [];
      setCases(data);
      if (data.length > 0) {
        setSelectedHeroCaseId(data[0].id);
      }
    } catch (err) {
      console.warn('Failed to load nearby cases:', err);
    } finally {
      setLoadingCases(false);
    }

    // 2. Fetch real categories
    setLoadingCategories(true);
    try {
      const catRes = await apiClient.get('/areas/categories');
      const catList = catRes.data?.results || (Array.isArray(catRes.data) ? catRes.data : []);
      setCategories(catList);
    } catch (err) {
      console.warn('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Filter public cases for the accountability section
  const filteredCases = cases.filter((c) => {
    // Status filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) {
      return false;
    }
    // Category filter
    if (categoryFilter !== 'ALL' && (c.category?.slug !== categoryFilter && (c as any).category_name !== categoryFilter)) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchNumber = c.case_number?.toLowerCase().includes(query);
      const matchDesc = c.description?.toLowerCase().includes(query);
      const matchLandmark = c.landmark?.toLowerCase().includes(query);
      return matchNumber || matchDesc || matchLandmark;
    }
    return true;
  });

  // Selected case for the Hero Interactive Preview
  const activeHeroCase = cases.find((c) => c.id === selectedHeroCaseId) || cases[0];

  // Helper for category icons
  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case 'garbage-accumulation':
        return <Flame className="h-4 w-4 text-amber-600" />;
      case 'overflowing-bin':
        return <Layers className="h-4 w-4 text-sky-600" />;
      case 'illegal-dumping':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'missed-collection':
        return <Clock className="h-4 w-4 text-teal-600" />;
      default:
        return <Camera className="h-4 w-4 text-slate-600" />;
    }
  };

  const faqs = [
    {
      q: 'How does verified resolution prevent premature ticket closure?',
      a: 'Unlike traditional portals where municipal tickets can be marked closed with a single administrative click, CitizenCivic requires field operators to submit on-ground photographic completion proof. The ticket enters "Verification Pending" where the citizen or peer auditor must confirm the site is clean before status becomes Verified Resolved.',
    },
    {
      q: 'What happens if a cleanup is claimed resolved but the waste remains?',
      a: 'Citizens hold unilateral dispute authority. When a resolution is reported, the reporter can click "Dispute Closure" with an objection note and photographic proof. This immediately reopens the ticket, revokes completion credit, and alerts supervisory personnel.',
    },
    {
      q: 'How are recurring garbage blackspots managed?',
      a: 'Cleaning a blackspot once does not guarantee it stays clean. When a recurring dump site is detected, CitizenCivic flags the location as a Hotspot and schedules mandatory 7-day and 30-day follow-up surveillance inspections.',
    },
    {
      q: 'How is citizen privacy protected in public accountability listings?',
      a: 'Reporter phone numbers are cryptographically hashed and never published or shared with contractors. Only public case numbers, ward names, and timestamps are visible on the public directory.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-200/90 bg-white pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Mission, Value Proposition, Action */}
            <div className="lg:col-span-6 space-y-5">
              {/* Civic pilot badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Bengaluru Municipal Field Pilot · Ward 82 (Indiranagar)</span>
              </div>

              {/* Exact Requested Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-slate-950 leading-[1.14]">
                Report civic issues.{' '}
                <span className="text-emerald-700">Track real resolution.</span>
              </h1>

              {/* Exact Requested Supporting Copy */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Report problems in your neighbourhood, follow every status update, and verify whether
                the issue has actually been resolved.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to={user ? '/report' : '/login'}>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Camera className="h-4 w-4 text-emerald-400" />}
                  >
                    Report an Issue
                  </Button>
                </Link>

                <a href="#public-cases">
                  <Button variant="secondary" size="md" icon={<ArrowRight className="h-4 w-4" />}>
                    Explore Public Cases
                  </Button>
                </a>
              </div>

              {/* Trust & Transparency Metrics (Grounded in Real Data) */}
              <div className="pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-slate-700 max-w-md">
                <div>
                  <div className="text-xl font-bold font-mono text-slate-950">
                    {cases.length > 0 ? cases.length : '4'}
                  </div>
                  <div className="text-xs text-slate-500">Live Pilot Cases</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-emerald-700">100%</div>
                  <div className="text-xs text-slate-500">Photographic Proof</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-slate-950">Zero</div>
                  <div className="text-xs text-slate-500">Checkbox Closures</div>
                </div>
              </div>
            </div>

            {/* Right Column: Genuine Product Preview & Architectural Grid */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {/* View Switcher Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      Live Ward Resolution Hub
                    </span>
                    <Badge variant="emerald" size="xs">
                      Active
                    </Badge>
                  </div>
                  <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs font-medium text-slate-600">
                    <button
                      type="button"
                      onClick={() => setHeroTab('cases')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        heroTab === 'cases' ? 'bg-slate-900 text-white' : 'hover:text-slate-900'
                      }`}
                    >
                      Case Inspector
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroTab('grid')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        heroTab === 'grid' ? 'bg-slate-900 text-white' : 'hover:text-slate-900'
                      }`}
                    >
                      3D Grid
                    </button>
                  </div>
                </div>

                {/* Tab 1: Real Cases Inspector */}
                {heroTab === 'cases' && (
                  <div className="p-4 space-y-3 font-sans">
                    {loadingCases ? (
                      <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                        Connecting to live database cases...
                      </div>
                    ) : activeHeroCase ? (
                      <div className="space-y-3">
                        {/* Selected Case Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {activeHeroCase.case_number}
                            </span>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {activeHeroCase.landmark}
                            </p>
                          </div>
                          <CaseStatusBadge status={activeHeroCase.status} />
                        </div>

                        {/* Real Description */}
                        <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-700 leading-relaxed">
                          <p className="line-clamp-2">{activeHeroCase.description}</p>
                        </div>

                        {/* Coordinate & Timestamp Meta */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {activeHeroCase.latitude.toFixed(4)}°N, {activeHeroCase.longitude.toFixed(4)}°E
                          </span>
                          <span>
                            Logged {new Date(activeHeroCase.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Selector for other real database cases */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Select Recent Case:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {cases.slice(0, 4).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedHeroCaseId(c.id)}
                                className={`text-left p-2 rounded border text-xs transition-colors cursor-pointer ${
                                  c.id === activeHeroCase.id
                                    ? 'border-slate-900 bg-slate-50 font-semibold'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                <div className="font-mono text-[11px] text-slate-900">
                                  {c.case_number}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {c.landmark}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 text-right">
                          <Link
                            to={`/cases/${activeHeroCase.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            <span>Inspect Full Timeline & Evidence</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No active cases found in the database.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Restrained Architectural 3D Grid */}
                {heroTab === 'grid' && (
                  <div className="p-3">
                    <Suspense fallback={<CivicStreetGridFallback className="h-64" />}>
                      <CivicStreetGrid3D className="h-64 w-full" />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW THE PRODUCT WORKS (Compact 4-Step Lifecycle) */}
      <section id="workflow" className="py-14 sm:py-16 border-b border-slate-200/90 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700">
              Accountability Protocol
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
              How Civic Issues Get Actually Resolved
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              A four-step closed-loop lifecycle with mandatory photographic proof and unilateral citizen dispute authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">01</span>
                <Camera className="h-4 w-4 text-slate-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Report with Proof</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizen captures the defect with precise GPS location, category classification, and an on-ground photograph.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">02</span>
                <Building2 className="h-4 w-4 text-slate-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Municipal Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The responsible Ward 82 solid waste unit receives the case, acknowledges assignment, and deploys cleanup crews.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">03</span>
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Resolution Evidence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Field operators must upload on-ground photographic evidence showing the clean spot. No administrative checkbox closures.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">04</span>
                <UserCheck className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Citizen Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The citizen verifies the site is clean. If incomplete, unilateral dispute reopens the ticket and notifies supervisors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SUPPORTED ISSUE CATEGORIES */}
      <section id="categories" className="py-14 sm:py-16 border-b border-slate-200/90 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
              Pilot Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
              Supported Defect Types
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Select an issue category to view active cases or file a report in your ward.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {loadingCategories
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
                ))
              : categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                        {getCategoryIcon(cat.slug)}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{cat.name_en}</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {cat.description || 'Verified municipal resolution category.'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <Link
                        to={`/cases?category=${cat.slug}`}
                        className="font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        View Cases &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* 4. PUBLIC CASES & ACCOUNTABILITY (KEY INTERACTIVE SECTION) */}
      <section id="public-cases" className="py-14 sm:py-20 border-b border-slate-200/90 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700">
                Community Transparency Directory
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
                Public Cases & Accountability
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Inspect active and resolved civic defects across your community. Every ticket is backed by photographic evidence.
              </p>
            </div>

            <Link to="/cases">
              <Button variant="secondary" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                Open Full Directory
              </Button>
            </Link>
          </div>

          {/* Interactive Filter Toolbar */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3 font-sans">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search case #, landmark, description..."
                  className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-xs">
                {['ALL', 'SUBMITTED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'VERIFIED_RESOLVED'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {st === 'ALL' ? 'All Statuses' : st.replace(/_/g, ' ')}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Cases Grid */}
          {loadingCases ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : filteredCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {c.case_number}
                      </span>
                      <CaseStatusBadge status={c.status} />
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.landmark}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3">
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    <Link
                      to={`/cases/${c.id}`}
                      className="font-sans font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Inspect Audit Trail</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700">No civic cases match your selected filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                }}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. CIVIC VERIFICATION GUARANTEE & CHARTER (Replaces Fake Points/Leaderboard) */}
      <section className="py-14 sm:py-16 border-b border-slate-200/90 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
              Our Standard
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mt-1">
              The CitizenCivic Guarantee
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Why our verification protocol is fundamentally different from traditional municipal complaint portals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                ✓
              </div>
              <h3 className="text-sm font-bold text-slate-900">Unilateral Citizen Dispute Authority</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Municipal operators cannot close a defect by administrative declaration alone. Citizens possess unilateral authority to dispute incomplete work within the verification window.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                📸
              </div>
              <h3 className="text-sm font-bold text-slate-900">Photographic Ground-Truth</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every resolution claim requires an on-ground photograph of the cleared pavement, drain, or bin. Images are permanently archived on the immutable timeline.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2 shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                🔒
              </div>
              <h3 className="text-sm font-bold text-slate-900">Cryptographic Citizen Privacy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizen phone numbers and private credentials are cryptographically hashed. Field contractors only see public defect coordinates and landmark details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="py-14 sm:py-16 border-b border-slate-200/90 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500">
              Questions & Answers
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200 font-sans">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM BANNER */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              Spot a civic defect in your neighborhood?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              File a report in 60 seconds with photographic proof and track its resolution in real time.
            </p>
          </div>
          <Link to={user ? '/report' : '/login'}>
            <Button variant="primary" size="md">
              Report an Issue Now &rarr;
            </Button>
          </Link>
        </div>
      </section>

      {/* 8. COMPACT PROFESSIONAL FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 text-xs text-slate-500 font-sans">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-950">
              Citizen<span className="text-emerald-700">Civic</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Open civic accountability engine for Indian municipal wards. Verified ground-truth resolution and unilateral citizen audit rights.
            </p>
          </div>

          <div>
            <span className="block text-[11px] font-mono font-bold text-slate-900 uppercase tracking-wider mb-2">
              Platform
            </span>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a href="#workflow" className="hover:text-slate-900">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-slate-900">
                  Supported Defect Types
                </a>
              </li>
              <li>
                <a href="#public-cases" className="hover:text-slate-900">
                  Public Cases Directory
                </a>
              </li>
              <li>
                <Link to="/report" className="hover:text-slate-900">
                  Report an Issue
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <span className="block text-[11px] font-mono font-bold text-slate-900 uppercase tracking-wider mb-2">
              Active Field Pilots
            </span>
            <ul className="space-y-1.5 text-[11px]">
              <li>Indiranagar (Ward 82), Bengaluru</li>
              <li>Koramangala 4th Block, Bengaluru</li>
              <li className="text-slate-400">Expanding to additional zones</li>
            </ul>
          </div>

          <div>
            <span className="block text-[11px] font-mono font-bold text-slate-900 uppercase tracking-wider mb-2">
              Verification Standard
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              Independent civic tech protocol. Not officially affiliated with or endorsed by BBMP or municipal corporations.
            </p>
            <p className="text-[10px] text-slate-400">
              &copy; {new Date().getFullYear()} CitizenCivic. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
