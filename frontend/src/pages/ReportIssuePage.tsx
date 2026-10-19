import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import apiClient from '../api/client';
import ImageUpload from '../components/ImageUpload';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import type { Category } from '../types';

interface AITriageData {
  suggested_category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazard_flags: string[];
  action_summary: string;
  duplicate_risk: string;
}

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step progress: 1: Category, 2: Location & Details, 3: Evidence, 4: Review
  const [step, setStep] = useState(1);
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<AITriageData | null>(null);

  // Form State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [manualCoordsOpen, setManualCoordsOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [declarationChecked, setDeclarationChecked] = useState(false);

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
        if (cats.length > 0) setSelectedCategory(cats[0].id);
        if (areas.length > 0) setSelectedArea(areas[0].id);
      } catch (e) {
        console.error('Failed to load metadata', e);
      }
    };
    loadMetadata();
  }, []);

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
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        setLocationDetecting(false);
        setLocationDetected(false);
        setManualCoordsOpen(true);
        setError('Device GPS was unavailable or permission denied. Please enter coordinates manually or use the ward reference button.');
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
      if (!landmark.trim() || !description.trim()) {
        setError('Please provide a specific street landmark and problem description.');
        return;
      }
      if (description.trim().length < 10) {
        setError('Problem description must be at least 10 characters long.');
        return;
      }
      if (latitude === null || longitude === null) {
        setError('Geotagged coordinates are required. Please click "Detect My GPS" or enter coordinates.');
        setManualCoordsOpen(true);
        return;
      }
    }
    if (step === 3 && photos.length === 0) {
      setError('At least one clear photograph is required as verified proof of the blackspot.');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadWarning(null);

    if (!declarationChecked) {
      setError('Please confirm the verification declaration checkbox before submitting.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('Geotagged coordinates are required. Please go back to Step 2 to detect GPS or set coordinates.');
      return;
    }

    if (!selectedCategory) {
      setError('Please select an issue category to proceed.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Problem description must be at least 10 characters long.');
      return;
    }

    if (!landmark.trim() || landmark.trim().length < 2) {
      setError('Street landmark is required (at least 2 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const casePayload = {
        category_id: selectedCategory,
        category: selectedCategory,
        service_area_id: selectedArea || undefined,
        service_area: selectedArea || undefined,
        description: description.trim(),
        landmark: landmark.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      const caseRes = await apiClient.post('/cases', casePayload);
      const caseData = caseRes.data;

      // 2. Upload Evidence Photos safely
      let failedPhotosCount = 0;
      if (photos.length > 0) {
        for (const file of photos) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('evidence_type', 'PHOTO');
            await apiClient.post(`/cases/${caseData.id}/evidence`, formData);
          } catch (uploadErr) {
            console.error('Evidence upload error:', uploadErr);
            failedPhotosCount++;
          }
        }
      }

      setCreatedCaseNumber(caseData.case_number);
      setCreatedCaseId(caseData.id);
      if (failedPhotosCount > 0) {
        setUploadWarning(`${failedPhotosCount} of ${photos.length} photo(s) failed to upload, but case ${caseData.case_number} was successfully recorded.`);
      }
    } catch (err: any) {
      console.error('Case submission error', err);
      const data = err.response?.data;
      let errorMsg = 'Failed to submit report. Please check your network connection and retry.';
      if (typeof data === 'string') {
        errorMsg = data;
      } else if (data?.detail) {
        errorMsg = data.detail;
      } else if (data?.description?.[0]) {
        errorMsg = data.description[0];
      } else if (data?.errors) {
        const errorKeys = Object.keys(data.errors).filter((k) => k !== '_errors');
        if (errorKeys.length > 0) {
          const firstErr = data.errors[errorKeys[0]];
          if (firstErr?._errors?.[0]) {
            errorMsg = `${errorKeys[0].replace(/_/g, ' ')}: ${firstErr._errors[0]}`;
          }
        }
      }
      setError(errorMsg);
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

  // SUCCESS STATE
  if (createdCaseNumber && createdCaseId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center font-sans">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <Badge variant="emerald" size="sm">
              Verified Case Report Registered
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Civic Report Successfully Submitted
            </h1>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Your report has been logged with an immutable timestamp on the public ledger. You will be able to track status transitions and photographic evidence.
            </p>
          </div>

          {uploadWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-left">
              ⚠️ {uploadWarning}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>CASE REFERENCE NUMBER</span>
              <button
                type="button"
                onClick={handleCopyCaseNumber}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-950 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-xl font-bold font-mono text-slate-950 tracking-wider">
              {createdCaseNumber}
            </div>
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Reward Credited: <strong className="text-emerald-700">+10 Pts</strong></span>
              <span>Status: <strong className="text-slate-800">Submitted</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => navigate(`/cases/${createdCaseId}`)}
            >
              Track Case Status & Evidence &rarr;
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
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
            >
              Report Another Issue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* Header & Step Tracker */}
      <div className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel and return</span>
          </Link>
          <span className="font-mono text-xs text-slate-500 font-semibold">
            Step {step} of 4
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Report a Local Civic Issue
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Citizen issue reporting and transparent verification tracking.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <div className={`h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />
          <div className={`h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />
          <div className={`h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-slate-900' : 'bg-slate-200'}`} />
          <div className={`h-1.5 rounded-full transition-colors ${step >= 4 ? 'bg-slate-900' : 'bg-slate-200'}`} />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Select Issue Category</h2>
            <p className="text-xs text-slate-500">
              Categorization organizes reports and assigns them to the appropriate tracking workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{cat.name_en}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {cat.name_hi}
                    </span>
                  </div>
                  <p className={`mt-1.5 text-[11px] leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {cat.slug === 'garbage' && 'Roadside waste dumps, mixed garbage piles, and organic refuse.'}
                    {cat.slug === 'construction-debris' && 'Concrete rubble, sand bags, and building material obstruction.'}
                    {cat.slug === 'overflowing-bins' && 'Public bins overflowing onto pavement or footpaths.'}
                    {cat.slug === 'drainage' && 'Stormwater drains clogged with solid waste risking flooding.'}
                    {!['garbage', 'construction-debris', 'overflowing-bins', 'drainage'].includes(cat.slug) &&
                      'Unaddressed municipal blackspots requiring field intervention.'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Continue to Location
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: LOCATION & INCIDENT DETAILS */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">2. Location & Description</h2>
            <p className="text-xs text-slate-500">
              Provide exact landmarks so field teams can locate and clear the spot without delay.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
            {/* GPS Detection Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3.5 rounded-md border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Geotag Coordinates <span className="text-rose-600">*</span></span>
                </span>
                <span className={`text-[11px] font-mono ${latitude !== null && longitude !== null ? 'text-slate-700' : 'text-amber-700 font-semibold'}`}>
                  {latitude !== null && longitude !== null
                    ? `${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E ${locationDetected ? '(Device GPS)' : '(Manual Coordinates)'}`
                    : 'Coordinates required for geotagged dispatch'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={locationDetecting}
                  onClick={handleDetectLocation}
                  icon={<Navigation className="h-3 w-3 text-emerald-700" />}
                >
                  {locationDetected ? '✓ GPS Acquired' : 'Detect My GPS'}
                </Button>
                <button
                  type="button"
                  onClick={() => setManualCoordsOpen(!manualCoordsOpen)}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  {manualCoordsOpen ? 'Hide Manual' : 'Manual Coordinates'}
                </button>
              </div>
            </div>

            {/* Optional Manual Coordinate Inputs */}
            {manualCoordsOpen && (
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="lat-input" className="block text-[11px] font-medium text-slate-600 mb-1">Latitude</label>
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
                    placeholder="e.g. 12.9784"
                    className="w-full rounded border border-slate-300 py-1.5 px-2 font-mono text-xs text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="lng-input" className="block text-[11px] font-medium text-slate-600 mb-1">Longitude</label>
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
                    placeholder="e.g. 77.6408"
                    className="w-full rounded border border-slate-300 py-1.5 px-2 font-mono text-xs text-slate-900 bg-white"
                  />
                </div>
                <div className="col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-1 border-t border-slate-200/60 text-[10px]">
                  <span className="text-slate-500">
                    If browser GPS is unavailable on your device, enter coordinates manually or choose ward center.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(12.9784);
                      setLongitude(77.6408);
                      setLocationDetected(false);
                      setError(null);
                    }}
                    className="font-semibold text-emerald-800 hover:underline shrink-0 text-left sm:text-right cursor-pointer"
                  >
                    Use Ward 82 Reference (12.9784, 77.6408)
                  </button>
                </div>
              </div>
            )}

            {/* Landmark / Street Input */}
            <div className="space-y-1.5">
              <label htmlFor="landmark-input" className="block text-xs font-semibold text-slate-800">
                Street Landmark or Address <span className="text-rose-600">*</span>
              </label>
              <input
                id="landmark-input"
                type="text"
                required
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 104, near 12th Main crossroad"
                className="w-full rounded-md border border-slate-300 py-2.5 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <label htmlFor="description-input" className="block text-xs font-semibold text-slate-800">
                Detailed Problem Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="description-input"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the nature of the waste accumulation, estimated volume, and any immediate hazard..."
                className="w-full rounded-md border border-slate-300 py-2.5 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden"
              />

              {/* AI Triage Trigger */}
              <div className="pt-1.5 flex items-center justify-between">
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  loading={aiTriageLoading}
                  onClick={handleAITriage}
                  icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
                >
                  Run Civic AI Triage & Hazard Scan
                </Button>
                {aiTriageResult && (
                  <span className="text-[11px] text-emerald-700 font-medium">
                    ✓ AI analysis complete
                  </span>
                )}
              </div>

              {/* AI Triage Intelligence Card */}
              {aiTriageResult && (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Civic AI Triage Report</span>
                    </span>
                    <Badge variant={aiTriageResult.priority === 'CRITICAL' ? 'red' : aiTriageResult.priority === 'HIGH' ? 'amber' : 'emerald'} size="xs">
                      Priority: {aiTriageResult.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    <span className="font-semibold">Action Plan: </span>{aiTriageResult.action_summary}
                  </p>
                  {aiTriageResult.hazard_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiTriageResult.hazard_flags.map((h, i) => (
                        <span key={i} className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 border border-rose-200">
                          ⚠ {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button type="button" variant="subtle" size="md" onClick={handlePrevStep}>
              &larr; Back
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Continue to Photos
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: EVIDENCE UPLOAD */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">3. Photographic Evidence</h2>
            <p className="text-xs text-slate-500">
              Clear on-ground proof is mandatory to prevent spurious claims and allow verified before-and-after audit.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
            <ImageUpload
              onFilesSelected={(f) => setPhotos(f)}
              maxFiles={3}
              maxSizeMB={10}
              label="Capture or upload photo of the blackspot"
              helperText="Take clear wide-angle photos showing the scale of waste accumulation and nearby landmarks."
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button type="button" variant="subtle" size="md" onClick={handlePrevStep}>
              &larr; Back
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Review & Submit
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & DECLARATION */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">4. Final Verification & Submit</h2>
            <p className="text-xs text-slate-500">
              Review your report summary. Once submitted, an official case tracking number is generated and recorded on the public timeline.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden text-xs">
            <div className="p-4 grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-500">Category:</span>
              <span className="col-span-2 font-bold text-slate-900">{selectedCategoryObj?.name_en || 'General Garbage'}</span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-500">Landmark:</span>
              <span className="col-span-2 font-medium text-slate-900">{landmark}</span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-500">Coordinates:</span>
              <span className="col-span-2 font-mono text-slate-700">
                {latitude !== null && longitude !== null ? (
                  <span className="text-emerald-700 font-semibold">
                    {latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E {locationDetected ? '(GPS Geotagged)' : '(Manual Location)'}
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium">⚠️ No coordinates set (Return to Step 2)</span>
                )}
              </span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-500">Description:</span>
              <span className="col-span-2 text-slate-700">{description}</span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-2">
              <span className="font-semibold text-slate-500">Evidence Attached:</span>
              <span className="col-span-2 font-mono text-emerald-800 font-semibold">{photos.length} photograph(s) attached</span>
            </div>
          </div>

          {/* Citizen Certification */}
          <div className={`rounded-md border p-3.5 flex items-start gap-3 transition-colors ${
            !declarationChecked && error
              ? 'border-rose-300 bg-rose-50/70'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <input
              id="declaration-checkbox"
              type="checkbox"
              checked={declarationChecked}
              onChange={(e) => {
                setDeclarationChecked(e.target.checked);
                if (error) setError(null);
              }}
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer h-4 w-4"
            />
            <label htmlFor="declaration-checkbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
              I certify that this report reflects a genuine civic issue observed in my locality, backed by photographic evidence I personally captured.
            </label>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button type="button" variant="subtle" size="md" onClick={handlePrevStep} disabled={submitting}>
              &larr; Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            >
              {submitting ? 'Submitting Geotagged Report...' : 'Submit Geotagged Report'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReportIssuePage;
