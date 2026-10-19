import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import apiClient from '../api/client';
import ImageUpload from '../components/ImageUpload';
import type { Category, ServiceArea } from '../types';

export const ReportIssuePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Multi-step progress: 1: Category, 2: Details & Location, 3: Evidence, 4: Review
  const [step, setStep] = useState(1);

  // Form State
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9784); // Default to Indiranagar
  const [longitude, setLongitude] = useState<number>(77.6408);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [createdCaseNumber, setCreatedCaseNumber] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load categories and service areas
    const loadMetadata = async () => {
      try {
        const [catRes, areaRes] = await Promise.all([
          apiClient.get('/areas/categories/'),
          apiClient.get('/areas/service-areas/'),
        ]);
        setCategories(catRes.data.results || catRes.data);
        const areas = areaRes.data.results || areaRes.data;
        setServiceAreas(areas);
        if (areas.length > 0) setSelectedArea(areas[0].id);
      } catch (e) {
        console.error('Failed to load form metadata', e);
      }
    };
    loadMetadata();
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocationDetecting(false);
        setLocationDetected(true);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationDetecting(false);
        // Fallback to landmark-based entry
        setError('Could not detect GPS location. You can enter the street landmark manually below.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && !selectedCategory) {
      setError('Please select an issue category to proceed.');
      return;
    }
    if (step === 2 && (!description.trim() || !landmark.trim())) {
      setError('Please provide a description and nearby landmark/address.');
      return;
    }
    if (step === 3 && photos.length === 0) {
      setError('At least one photograph is required as verified proof of the issue.');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!privacyConsent) {
      setError('Please confirm that this photo was taken safely and in a public area.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Case
      const casePayload = {
        category: selectedCategory,
        service_area: selectedArea || null,
        description,
        landmark,
        latitude,
        longitude,
      };

      const caseRes = await apiClient.post('/cases/', casePayload);
      const caseData = caseRes.data;

      // 2. Upload Evidence Photos
      if (photos.length > 0) {
        for (const file of photos) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('evidence_type', 'PHOTO');
          await apiClient.post(`/cases/${caseData.id}/evidence/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      setCreatedCaseNumber(caseData.case_number);
      setCreatedCaseId(caseData.id);
    } catch (err: any) {
      console.error('Case submission error', err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.description?.[0] ||
          'Failed to submit report. Please check your network connection and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdCaseNumber && createdCaseId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Officially Submitted
            </span>
            <h1 className="mt-3 text-2xl font-black text-slate-900">
              {t('report.success', 'Issue Reported Successfully!')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your submission has been securely recorded and queued for review and forwarding to the local operating unit.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">Case Tracking Number</span>
            <div className="font-mono text-2xl font-black text-slate-900 tracking-wider mt-1">
              {createdCaseNumber}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Save this number or track updates in real-time from your dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate(`/cases/${createdCaseId}`)}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
            >
              Track Case Timeline
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>{t('report.title', 'Report a Garbage Issue')}</span>
          <span>Step {step} of 4</span>
        </div>
        {/* Progress Bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-lg border border-slate-100">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: CATEGORY SELECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">What type of problem are you seeing?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select the civic category that best describes the situation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedCategory === cat.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedCategory === cat.id
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedCategory === cat.id && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {cat.name_en} <span className="text-slate-400 font-normal">({cat.name_hi})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cat.slug === 'garbage-accumulation' && 'Piles of uncollected waste or litter on road or footpath'}
                      {cat.slug === 'missed-collection' && 'Door-to-door or lane collection truck missed scheduled route'}
                      {cat.slug === 'recurring-hotspot' && 'Chronic vulnerable dumping spot that recurs repeatedly'}
                      {cat.slug === 'overflowing-bin' && 'Public community bin full with trash spilling around'}
                      {cat.slug === 'illegal-dumping' && 'Construction debris, debris, or night dumping by vehicles'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {serviceAreas.length > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Pilot Service Ward
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                >
                  {serviceAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.name_hi})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: DETAILS & LOCATION */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Where is the issue located?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide landmark details so field operators can identify the exact spot.
              </p>
            </div>

            {/* Geolocation Button */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">GPS Coordinates</span>
                  <div className="font-mono text-xs text-slate-500 mt-0.5">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationDetecting}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Navigation className={`h-3.5 w-3.5 ${locationDetecting ? 'animate-spin' : ''}`} />
                  <span>{locationDetecting ? 'Detecting...' : locationDetected ? 'GPS Updated' : 'Use My GPS'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Street Landmark / Address *
              </label>
              <input
                type="text"
                required
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Opposite Metro Pillar 45, CMH Road, near Coffee Day"
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Problem Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the type of waste, how long it has been accumulating, whether it blocks pedestrians or drains..."
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* STEP 3: PHOTO EVIDENCE */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Upload Photographic Evidence</h2>
              <p className="text-xs text-slate-500 mt-1">
                Photos provide the baseline for verified resolution. Please take a clear, well-lit photo showing the waste and surroundings.
              </p>
            </div>

            <ImageUpload onFilesSelected={setPhotos} maxFiles={3} maxSizeMB={10} />

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Safety First</strong>: Never stand in live traffic or enter hazardous spots to take photos. Capture safely from a public sidewalk.
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Review & Confirm Submission</h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify your report details before submitting to the operating team.
              </p>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Category</span>
                <span className="font-bold text-slate-900">
                  {categories.find((c) => c.id === selectedCategory)?.name_en}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Landmark</span>
                <span className="font-medium text-slate-900 text-right max-w-xs">{landmark}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500">Coordinates</span>
                <span className="font-mono text-slate-700">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              </div>
              <div className="border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-500 block mb-1">Description</span>
                <p className="text-slate-800">{description}</p>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Photos Attached</span>
                <span className="font-bold text-emerald-700">{photos.length} photo(s)</span>
              </div>
            </div>

            {/* Privacy & Safety Consent Checkbox */}
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600">
                I confirm that this report describes a genuine civic issue, that photos were captured safely from a public space, and that no private personal documents are shown.
              </span>
            </label>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !privacyConsent}
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Submit Verified Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportIssuePage;
