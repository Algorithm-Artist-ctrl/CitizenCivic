import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Navigation,
  MapPin,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Search,
  Camera,
  FileText,
  Send,
} from 'lucide-react';
import apiClient from '../api/client';
import ImageUpload from '../components/ImageUpload';
import GoogleMapView, { loadGoogleMaps } from '../components/GoogleMapView';
import type { Category } from '../types';

interface AITriageData {
  suggested_category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazard_flags: string[];
  action_summary: string;
  duplicate_risk: string;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 5 Primary 3D Categories matching the mockup
const MOCKUP_CATEGORIES = [
  {
    id: 'cat-garbage',
    slug: 'garbage',
    title: 'Garbage Dump / Overflowing Waste Bin',
    subtitle_hi: 'कचरा डंप / ओवरफ्लो बिन',
    color_hi: 'text-amber-700 bg-amber-50 border-amber-200',
    desc: 'Unattended municipal waste, overflowing street bins, or scattered neighborhood litter.',
    image: '/assets/cat-garbage.jpg',
  },
  {
    id: 'cat-truck',
    slug: 'missed-collection',
    title: 'Waste Collection Truck Missed',
    subtitle_hi: 'कचरा गाड़ी नहीं आई',
    color_hi: 'text-blue-700 bg-blue-50 border-blue-200',
    desc: 'Daily door-to-door solid waste collection vehicle missed scheduled morning collection.',
    image: '/assets/cat-truck.jpg',
  },
  {
    id: 'cat-hotspot',
    slug: 'chronic-hotspot',
    title: 'Chronic Dumping Hotspot',
    subtitle_hi: 'सदाबहार कचरा डंपिंग पॉइंट',
    color_hi: 'text-rose-700 bg-rose-50 border-rose-200',
    desc: 'Persistent recurring blackspot requiring dedicated clearance and barricading.',
    image: '/assets/cat-hotspot.jpg',
  },
  {
    id: 'cat-bin',
    slug: 'damaged-bin',
    title: 'Damaged / Missing Dustbin',
    subtitle_hi: 'टूटा या गायब कचरा पात्र',
    color_hi: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    desc: 'Broken municipal green/blue segregated bins or missing public waste receptacles.',
    image: '/assets/cat-bin.jpg',
  },
  {
    id: 'cat-dumping',
    slug: 'construction-debris',
    title: 'Illegal Construction Debris Dumping',
    subtitle_hi: 'अवैध मलबा डंपिंग',
    color_hi: 'text-purple-700 bg-purple-50 border-purple-200',
    desc: 'Unauthorized dumping of construction debris, bricks, concrete, and industrial waste.',
    image: '/assets/cat-dumping.jpg',
  },
];

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Multi-step progress: 1: Category, 2: Location & Details, 3: Evidence, 4: Review
  const [step, setStep] = useState(1);
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<AITriageData | null>(null);

  // Form State
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('cat-garbage');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(12.9716);
  const [longitude, setLongitude] = useState<number | null>(77.6412);
  const [locationSource, setLocationSource] = useState<'VERIFIED_ADDRESS' | 'MANUAL_PIN' | 'GPS_DETECTED'>('MANUAL_PIN');
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [manualCoordsOpen, setManualCoordsOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  // Autocomplete ref
  const landmarkInputRef = useRef<HTMLInputElement>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [createdCaseNumber, setCreatedCaseNumber] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catRes, areaRes] = await Promise.all([
          apiClient.get('/areas/categories/').catch(() => ({ data: { results: [] } })),
          apiClient.get('/areas/service-areas/').catch(() => ({ data: { results: [] } })),
        ]);
        const cats = catRes.data.results || catRes.data || [];
        const areas = areaRes.data.results || areaRes.data || [];
        setCategories(cats);
        setServiceAreas(areas);
        if (areas.length > 0) setSelectedArea(areas[0].id);

        // Preload Google Maps libraries in background
        loadGoogleMaps().catch(() => {});
      } catch (e) {
        console.error('Failed to load metadata', e);
      }
    };
    loadMetadata();
  }, []);

  // Initialize Places Autocomplete on landmark input in Step 2
  useEffect(() => {
    let isMounted = true;
    if (step === 2) {
      const timer = setTimeout(() => {
        if (!isMounted || !landmarkInputRef.current) return;
        if (typeof google !== 'undefined' && google.maps?.places?.Autocomplete) {
          try {
            const autocomplete = new google.maps.places.Autocomplete(landmarkInputRef.current, {
              componentRestrictions: { country: 'in' },
              fields: ['formatted_address', 'geometry', 'name'],
            });

            autocomplete.addListener('place_changed', () => {
              if (!isMounted) return;
              const place = autocomplete.getPlace();
              if (place.geometry?.location) {
                const lat = Number(place.geometry.location.lat().toFixed(6));
                const lng = Number(place.geometry.location.lng().toFixed(6));
                setLatitude(lat);
                setLongitude(lng);
                setLandmark(place.formatted_address || place.name || '');
                setLocationSource('VERIFIED_ADDRESS');
                setLocationDetected(false);
                setError(null);
              }
            });
          } catch (e) {
            console.warn('[ReportIssuePage] Autocomplete setup notice:', e);
          }
        }
      }, 200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [step]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setManualCoordsOpen(true);
      return;
    }
    setLocationDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocationDetecting(false);
        setLocationDetected(true);
        setLocationSource('GPS_DETECTED');
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        setLocationDetecting(false);
        setLocationDetected(false);
        setManualCoordsOpen(true);
        setError('Device GPS was unavailable or permission denied. Please enter coordinates manually or use the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAITriage = async () => {
    if (!description.trim()) {
      setError('Please provide a description first to run AI triage.');
      return;
    }
    setAiTriageLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<AITriageData>('/ai/triage', {
        description,
        landmark,
      });
      setAiTriageResult(res.data);
    } catch (e: any) {
      console.warn('AI Triage error:', e);
      setError('AI triage temporarily unavailable. You can proceed manually.');
    } finally {
      setAiTriageLoading(false);
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && !selectedCategory) {
      setError('Please select an issue category to proceed.');
      return;
    }
    if (step === 2) {
      if (!landmark.trim()) {
        setError('Please provide a specific street landmark or Google Maps address.');
        return;
      }
      if (latitude === null || longitude === null) {
        setError('Please set map coordinates for geotagged municipal dispatch.');
        return;
      }
    }
    if (step === 3) {
      if (!description.trim()) {
        setError('Please enter a description of the civic problem.');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadWarning(null);

    if (!declarationChecked) {
      setError('Please certify that your report reflects genuine on-ground observation.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('A valid location coordinate is required.');
      return;
    }

    setSubmitting(true);

    try {
      // Find matching backend category ID
      let matchedCategoryId = '';
      const chosenMockupCat = MOCKUP_CATEGORIES.find((c) => c.id === selectedCategory);
      if (chosenMockupCat) {
        const found = categories.find(
          (c) => c.slug === chosenMockupCat.slug || c.name_en.toLowerCase().includes(chosenMockupCat.slug)
        );
        matchedCategoryId = found ? found.id : (categories[0]?.id || selectedCategory);
      } else {
        matchedCategoryId = categories[0]?.id || selectedCategory;
      }

      const payload = {
        category: matchedCategoryId,
        service_area: selectedArea || (serviceAreas[0]?.id || null),
        description: description.trim() || chosenMockupCat?.title || 'Civic issue report',
        landmark: landmark.trim() || 'Indiranagar, Ward 82',
        latitude,
        longitude,
        location_source: locationSource,
      };

      const res = await apiClient.post('/cases/', payload);
      const newCase = res.data;
      const caseId = newCase.id;
      const caseNumber = newCase.case_number;

      setCreatedCaseNumber(caseNumber);
      setCreatedCaseId(caseId);

      // Upload photos if any
      if (photos.length > 0 && caseId) {
        try {
          for (const photo of photos) {
            const formData = new FormData();
            formData.append('file', photo);
            formData.append('evidence_type', 'BEFORE_PHOTO');
            await apiClient.post(`/cases/${caseId}/evidence/`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
        } catch (uploadErr) {
          console.warn('Evidence upload warning:', uploadErr);
          setUploadWarning('Report created successfully, but photo upload encountered an issue.');
        }
      }
    } catch (err: any) {
      console.error('Case submission error:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to submit report. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCaseNumber = () => {
    if (createdCaseNumber) {
      navigator.clipboard.writeText(createdCaseNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SUCCESS SCREEN
  if (createdCaseNumber && createdCaseId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-mono font-bold text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>GEOTAGGED REPORT REGISTERED</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-heading">
              Report Submitted Successfully
            </h1>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your report has been geotagged and dispatched to the designated field response team. Follow-up inspection will verify resolution.
            </p>
          </div>

          {uploadWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-left">
              ⚠️ {uploadWarning}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>CASE REFERENCE NUMBER</span>
              <button
                type="button"
                onClick={handleCopyCaseNumber}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-950 cursor-pointer font-sans font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-950 tracking-wider">
              {createdCaseNumber}
            </div>
            <div className="pt-3 border-t border-slate-200/80 text-xs text-slate-500 flex items-center justify-between">
              <span>Reward Credited: <strong className="text-emerald-700 font-mono">+25 Pts</strong></span>
              <span>Status: <strong className="text-slate-900 font-semibold">Submitted (Dispatch Pending)</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/cases/${createdCaseId}`)}
              className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              Track Case Status &amp; Evidence →
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedCaseNumber(null);
                setCreatedCaseId(null);
                setStep(1);
                setDescription('');
                setLandmark('');
                setPhotos([]);
                setDeclarationChecked(false);
                setUploadWarning(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedMockupCat = MOCKUP_CATEGORIES.find((c) => c.id === selectedCategory) || MOCKUP_CATEGORIES[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Top Header & Stepper */}
      <div className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel and return</span>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] text-slate-700 font-bold">
            STEP {step} OF 4
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-heading">
            Report a Civic Issue
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {step === 1 && 'Select the primary issue category below to dispatch to the correct municipal department.'}
            {step === 2 && 'Pin the exact on-ground location and street address so response teams can locate the spot.'}
            {step === 3 && 'Provide problem details and attach clear photographic evidence for verification.'}
            {step === 4 && 'Review your report details and verify authenticity before official dispatch.'}
          </p>
        </div>

        {/* 4-Step Icon Stepper Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
              step === 1
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                : step > 1
                ? 'border-slate-200 bg-white text-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step > 1 ? 'bg-emerald-600 text-white' : step === 1 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span className="text-xs font-bold truncate">1. Category</span>
          </div>

          <div
            onClick={() => { if (step > 2) setStep(2); }}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
              step === 2
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                : step > 2
                ? 'border-slate-200 bg-white text-slate-800 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step > 2 ? 'bg-emerald-600 text-white' : step === 2 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <span className="text-xs font-bold truncate">2. Location</span>
          </div>

          <div
            onClick={() => { if (step > 3) setStep(3); }}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
              step === 3
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                : step > 3
                ? 'border-slate-200 bg-white text-slate-800 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step > 3 ? 'bg-emerald-600 text-white' : step === 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {step > 3 ? '✓' : '3'}
            </div>
            <span className="text-xs font-bold truncate">3. Details &amp; Photo</span>
          </div>

          <div
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
              step === 4
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step === 4 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              4
            </div>
            <span className="text-xs font-bold truncate">4. Submit</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}

      {/* STEP 1: CATEGORY SELECTION (PIXEL-PERFECT MOCKUP 3) */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: 5 Category Cards */}
          <div className="lg:col-span-8 space-y-3">
            {MOCKUP_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setError(null);
                  }}
                  className={`group relative flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/30 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* 3D Illustration Thumbnail */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-950 font-heading">
                          {cat.title}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.color_hi}`}>
                          {cat.subtitle_hi}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 max-w-xl leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>

                  {/* Selection Indicator Circle */}
                  <div className="pl-3 shrink-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-300 bg-slate-50 text-slate-400 group-hover:border-slate-400'
                    }`}>
                      {isSelected ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: 3D Mascot Billboard Banner */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
              {/* 3D Mascot Image */}
              <div className="relative h-48 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src="/assets/report-mascot.jpg"
                  alt="Clean Cities Brighter India"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold block">
                  CLEAN CITIES · BRIGHTER INDIA
                </span>
                <h4 className="text-sm font-extrabold text-slate-950 font-heading">
                  Verified Geotagged Civic Dispatch
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your report automatically alerts the nearest municipal supervisor with GPS verification and photographic evidence.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>+25 Karma points upon verified submission</span>
                </div>
                <p>Every report is timestamped on the public ledger.</p>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all"
              >
                <span>Continue to Location →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LOCATION & MAP */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
            {/* GPS Detection Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <span>Geotag Coordinates <span className="text-rose-600">*</span></span>
                </span>
                <span className={`text-xs font-mono font-semibold ${latitude !== null && longitude !== null ? 'text-slate-700' : 'text-amber-700'}`}>
                  {latitude !== null && longitude !== null
                    ? `${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E ${locationDetected ? '(Device GPS)' : '(Interactive Pin)'}`
                    : 'Coordinates required for geotagged dispatch'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationDetecting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{locationDetecting ? 'Detecting...' : locationDetected ? '✓ GPS Acquired' : 'Detect My GPS'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualCoordsOpen(!manualCoordsOpen)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  {manualCoordsOpen ? 'Hide Manual' : 'Manual Coordinates'}
                </button>
              </div>
            </div>

            {/* Optional Manual Coordinate Inputs */}
            {manualCoordsOpen && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="lat-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Latitude
                  </label>
                  <input
                    id="lat-input"
                    type="number"
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLatitude(isNaN(val) ? null : val);
                      setLocationDetected(false);
                    }}
                    placeholder="e.g. 12.9716"
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 font-mono text-xs text-slate-900 bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="lng-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Longitude
                  </label>
                  <input
                    id="lng-input"
                    type="number"
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLongitude(isNaN(val) ? null : val);
                      setLocationDetected(false);
                    }}
                    placeholder="e.g. 77.6412"
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 font-mono text-xs text-slate-900 bg-white focus:outline-hidden focus:border-slate-900"
                  />
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between">
                  <span className="text-slate-500">Need a reference point?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(12.9716);
                      setLongitude(77.6412);
                      setLocationDetected(false);
                      setLandmark('12th Main Road, HAL 2nd Stage, Indiranagar, Ward 82');
                      setError(null);
                    }}
                    className="font-bold text-emerald-800 hover:underline"
                  >
                    Use Ward 82 Reference (12.9716, 77.6412)
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Google Map */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Interactive Map Pinpoint</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  (Click or drag pin to position)
                </span>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <GoogleMapView
                  selectedLocation={latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null}
                  onLocationSelect={(loc) => {
                    setLatitude(loc.lat);
                    setLongitude(loc.lng);
                    setLocationDetected(false);
                    setLocationSource('MANUAL_PIN');
                    setError(null);
                    if (typeof google !== 'undefined' && google.maps?.Geocoder) {
                      try {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: loc }, (results, status) => {
                          if (status === 'OK' && results && results[0]) {
                            if (!landmark.trim()) {
                              setLandmark(results[0].formatted_address);
                            }
                          }
                        });
                      } catch (e) {
                        console.warn('Reverse geocode note:', e);
                      }
                    }
                  }}
                  interactive={true}
                  height="280px"
                />
              </div>
            </div>

            {/* Landmark / Street Address Input */}
            <div className="space-y-1.5">
              <label htmlFor="landmark-input" className="block text-xs font-bold text-slate-800">
                Street Landmark or Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  ref={landmarkInputRef}
                  id="landmark-input"
                  type="text"
                  required
                  value={landmark}
                  onChange={(e) => {
                    setLandmark(e.target.value);
                    if (locationSource === 'VERIFIED_ADDRESS') {
                      setLocationSource('MANUAL_PIN');
                    }
                  }}
                  placeholder="Search Google Maps address or enter street landmark (e.g. 12th Main Road, HAL 2nd Stage)..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-500">
                Google Places suggestions appear automatically as you type. Or click on the map above to drop a pinpoint.
              </p>
            </div>

            {/* Zone Boundary Verification */}
            {(() => {
              const activeZone = serviceAreas.find((a: any) => a.id === selectedArea) || serviceAreas[0];
              if (latitude !== null && longitude !== null && activeZone && typeof activeZone.latitude === 'number') {
                const dist = calculateDistanceMeters(latitude, longitude, activeZone.latitude, activeZone.longitude);
                const isInside = dist <= (activeZone.radius_meters || 2500) * 1.5;
                const zoneName = i18n.language === 'hi' ? (activeZone.name_hi || activeZone.name) : activeZone.name;
                return (
                  <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                    isInside ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}>
                    {isInside ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    )}
                    <span className="font-semibold">
                      {isInside
                        ? `✓ Within ${zoneName} service area (${Math.round(dist)}m from ward center)`
                        : `Notice: Location is ${Math.round(dist / 1000)} km from ${zoneName} center. Dispatched to regional ward response.`
                      }
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← Back to Categories
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <span>Continue to Details &amp; Photo →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DETAILS & PHOTO EVIDENCE */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="description-input" className="block text-xs font-bold text-slate-800">
                Detailed Problem Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="description-input"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the nature of the waste accumulation, estimated volume, and any immediate hazard..."
                className="w-full rounded-xl border border-slate-300 py-3 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* AI Triage Trigger */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAITriage}
                disabled={aiTriageLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>{aiTriageLoading ? 'Analyzing...' : 'Run Civic AI Hazard Scan'}</span>
              </button>
              {aiTriageResult && (
                <span className="text-xs font-bold text-emerald-700">
                  ✓ Priority: {aiTriageResult.priority}
                </span>
              )}
            </div>

            {/* Photo Evidence Upload */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-emerald-700" />
                  <span>Photographic Evidence</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  JPEG, PNG, WebP · Max 10MB
                </span>
              </div>
              <ImageUpload
                onFilesSelected={(f) => setPhotos(f)}
                maxFiles={3}
                maxSizeMB={10}
                label="Capture or upload photo of the civic issue"
                helperText="Take clear wide-angle photos showing the scale of waste accumulation and nearby landmarks."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← Back to Location
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <span>Review Report →</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & DECLARATION */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-950 font-heading">
                  Report Summary Review
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                READY FOR DISPATCH
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Category */}
              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-500">Category:</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-slate-900">{selectedMockupCat.title}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${selectedMockupCat.color_hi}`}>
                    {selectedMockupCat.subtitle_hi}
                  </span>
                </div>
              </div>

              {/* Landmark */}
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-semibold text-slate-500 shrink-0">Landmark / Address:</span>
                <span className="font-bold text-slate-900 text-right">{landmark || 'Indiranagar, Ward 82'}</span>
              </div>

              {/* Coordinates */}
              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-500">Coordinates:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {latitude ? `${latitude.toFixed(6)}° N, ${longitude?.toFixed(6)}° E` : '12.9716° N, 77.6412° E'}
                </span>
              </div>

              {/* Description */}
              <div className="py-3 flex items-start justify-between gap-4">
                <span className="font-semibold text-slate-500 shrink-0">Description:</span>
                <span className="text-slate-700 text-right max-w-md">{description || selectedMockupCat.desc}</span>
              </div>

              {/* Photos */}
              <div className="py-3 flex items-center justify-between">
                <span className="font-semibold text-slate-500">Evidence Attached:</span>
                <span className="font-mono font-bold text-slate-900">
                  {photos.length > 0 ? `${photos.length} photo(s) selected` : '1 standard photo'}
                </span>
              </div>
            </div>

            {/* Authenticity Declaration Checkbox */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
              <input
                id="declaration-checkbox"
                type="checkbox"
                checked={declarationChecked}
                onChange={(e) => {
                  setDeclarationChecked(e.target.checked);
                  if (error) setError(null);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 cursor-pointer"
              />
              <label htmlFor="declaration-checkbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                I certify that this report reflects a genuine civic issue observed on the ground with authentic location data.
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← Back to Details
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-7 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition-all disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Submitting Geotagged Report...' : 'Submit Geotagged Report'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReportIssuePage;
