import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  MapPin,
  Lock,
  Layers,
  Camera,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CivicSphere3D from '../components/CivicSphere3D';
import { MotionContainer } from '../components/ui/MotionContainer';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // Interactive Before/After slider toggle state
  const [activeProofTab, setActiveProofTab] = useState<'after' | 'before'>('after');
  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does verified resolution prevent fake ticket closures?',
      a: 'Unlike traditional municipal complaint systems where tickets are marked closed with administrative checkboxes, CitizenCivic requires field operators to submit on-ground photographic evidence. The case then enters a "Verification Pending" state where the citizen or independent community auditor must verify the resolution before the case is marked Verified Resolved.',
    },
    {
      q: 'What happens if an issue is claimed resolved but the waste is still there?',
      a: 'Citizens possess unilateral dispute authority. When a resolution is claimed, the reporter has a dedicated window to click "Dispute Closure" and submit an objection. This immediately moves the status to "Disputed Closure", revokes operator completion credit, and alerts supervisory personnel.',
    },
    {
      q: 'What is the Recurring Hotspot Protection protocol?',
      a: 'Cleaning up a blackspot once does not guarantee long-term cleanliness. CitizenCivic automatically schedules mandatory 7-day and 30-day automated follow-up audits on previously resolved chronic dump sites. If waste recurs, the location is flagged as a Hotspot.',
    },
    {
      q: 'How are citizen privacy and personal data handled?',
      a: 'Reporter phone numbers are cryptographically hashed and never exposed to field contractors or public listings. Citizens can choose display pseudonyms for the public leaderboard while retaining cryptographic auditability for their contributions.',
    },
    {
      q: 'What rewards can citizens earn?',
      a: 'Citizens earn verifiable civic karma points for valid reports, accurate photographic evidence, and participating in peer verification audits. These points power community recognition tiers (Neighborhood Sentinel, Community Warden, Civic Guardian).',
    },
  ];

  const categories = [
    {
      title: 'Illegal Garbage Dumping',
      desc: 'Unsanctioned roadside accumulations, vacant plot blackspots, and open trash piles.',
      sla: 'SLA: 12 hrs',
      icon: <Flame className="h-5 w-5 text-amber-600" />,
    },
    {
      title: 'Overflowing Municipal Bins',
      desc: 'Secondary waste collection bins exceeding storage capacity spilling onto footpaths.',
      sla: 'SLA: 6 hrs',
      icon: <Layers className="h-5 w-5 text-sky-600" />,
    },
    {
      title: 'Construction & Demolition Debris',
      desc: 'Heavy concrete rubble, sand piles, and construction debris obstructing public right-of-way.',
      sla: 'SLA: 24 hrs',
      icon: <Camera className="h-5 w-5 text-purple-600" />,
    },
    {
      title: 'Blocked Stormwater Drains',
      desc: 'Plastic waste and solid refuse blocking roadside drains causing flood risks.',
      sla: 'SLA: 8 hrs',
      icon: <Clock className="h-5 w-5 text-teal-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Pilot environment indicator bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-semibold text-slate-900">Active Field Pilot:</span>
            <span className="text-slate-600 hidden sm:inline">
              Bengaluru Ward 82 (Indiranagar) & Koramangala 4th Block · Verified Civic Resolution Protocol
            </span>
            <span className="text-slate-600 sm:hidden">Ward 82 Pilot Active</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span className="hidden md:inline">Ground-Truth Verified Protocol v2.1</span>
            {user ? (
              <Link to="/dashboard" className="font-bold text-emerald-700 hover:underline">
                Go to Dashboard &rarr;
              </Link>
            ) : (
              <Link to="/login" className="font-semibold text-slate-900 hover:underline">
                Officer / Citizen Sign In &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200/90 bg-white pt-14 pb-20 lg:pt-20 lg:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-60" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Mission, Value Proposition, Action */}
            <MotionContainer delay={0.05} className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Verified Ground-Truth Civic Resolution</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.12]">
                Civic issues deserve <br />
                <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy decoration-2">
                  verified ground-truth
                </span>{' '}
                resolutions.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                CitizenCivic replaces unaccountable complaint portals with photographic proof,
                partner service-level agreements, and independent citizen verification. No ticket is
                closed until the ground reality is confirmed clean.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user ? (
                  <Link to="/dashboard">
                    <Button variant="primary" size="lg" icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
                      Access {user.role} Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="primary" size="lg" icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
                        Report a Civic Issue
                      </Button>
                    </Link>
                    <Link to="/cases">
                      <Button variant="secondary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                        Explore Public Cases
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg text-slate-700">
                <div>
                  <div className="text-xl font-bold font-tabular text-slate-950">1,420+</div>
                  <div className="text-xs text-slate-500">Verified Cleared</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-tabular text-slate-950">3.8 hrs</div>
                  <div className="text-xs text-slate-500">Avg. Partner SLA</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-tabular text-slate-950">88%</div>
                  <div className="text-xs text-slate-500">Hotspot Prevention</div>
                </div>
              </div>
            </MotionContainer>

            {/* Right Column: Ground-truth interactive verification artifact & 3D Grid */}
            <MotionContainer delay={0.15} className="lg:col-span-5 space-y-4">
              <CivicSphere3D className="h-48 w-full" />
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg relative">
                {/* Header of proof card */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      CASE #CC-20261019-8921
                    </span>
                    <Badge variant="emerald" size="xs">
                      Verified Resolved
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>Resolved in 4h 12m</span>
                  </div>
                </div>

                {/* Location meta */}
                <div className="py-2.5 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    100ft Road, near 12th Main Junction, Indiranagar
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">12.9784° N, 77.6408° E</span>
                </div>

                {/* Proof toggle view */}
                <div className="space-y-3 pt-1">
                  <div className="flex rounded-md bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                    <button
                      onClick={() => setActiveProofTab('after')}
                      className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${
                        activeProofTab === 'after'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✓ Resolution Proof (Cleared)
                    </button>
                    <button
                      onClick={() => setActiveProofTab('before')}
                      className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${
                        activeProofTab === 'before'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⚠ Incident Report (Before)
                    </button>
                  </div>

                  {/* Simulated Photographic Canvas */}
                  <div className="relative aspect-16/10 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                    {activeProofTab === 'after' ? (
                      <div className="relative w-full h-full bg-slate-850 p-4 flex flex-col justify-between text-white">
                        <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/80 px-2 py-1 rounded backdrop-blur-xs">
                          <span className="text-emerald-400">● ON-GROUND VERIFICATION PHOTO</span>
                          <span>STAMP: 2026-10-19 14:22 IST</span>
                        </div>
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 rounded bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Pavement Fully Cleared & Disinfected</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Operator: Rapid Response Unit 4 · Verifier: Ward Supervisor R. Sharma
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full bg-slate-900 p-4 flex flex-col justify-between text-white">
                        <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/80 px-2 py-1 rounded backdrop-blur-xs">
                          <span className="text-amber-400">● CITIZEN EVIDENCE PHOTO</span>
                          <span>STAMP: 2026-10-19 10:10 IST</span>
                        </div>
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 rounded bg-amber-950/90 border border-amber-500/40 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            <Flame className="h-3.5 w-3.5" />
                            <span>Severe Mixed Waste Accumulation (Estimated 350kg)</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Reported by Citizen · Landmark: Opposite Metro Pillar 104
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit footnote */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-400" />
                    Cryptographic Audit Trail Intact
                  </span>
                  <span className="font-mono text-emerald-700 font-medium">Verified by Citizen</span>
                </div>
              </div>
            </MotionContainer>
          </div>
        </div>
      </section>

      {/* The 4-Stage Resolution Protocol */}
      <section className="py-16 lg:py-24 border-b border-slate-200/90 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              The Architecture of Accountability
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              How CitizenCivic Guarantees Real-World Resolution
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every reported issue moves through a strict state machine governed by immutable timestamps
              and role-based permissions.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">STAGE 01</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 text-xs font-bold">
                  01
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Geotagged Field Report</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Resident records the blackspot with GPS coordinates, precise landmark, and mandatory photographic proof.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-700">
                &rarr; Instant Case Number Generated
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">STAGE 02</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 text-xs font-bold">
                  02
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Partner SLA Routing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The issue is automatically assigned to the designated municipal concessionaire or ward team with strict SLA timers.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-700">
                &rarr; Target Acknowledgement: &lt; 4 hrs
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">STAGE 03</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 text-xs font-bold">
                  03
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">On-ground Photo Proof</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operators cannot mark work done with a text comment. They must upload on-ground photographic evidence of the cleared area.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-700">
                &rarr; Status: Verification Pending
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">STAGE 04</span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-800 text-xs font-bold">
                  04
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Independent Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The reporting citizen confirms resolution or disputes false closure. If disputed, the case immediately reopens.
              </p>
              <div className="pt-2 text-[11px] font-mono text-emerald-700">
                &rarr; 7 & 30-Day Hotspot Follow-up
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Overview */}
      <section className="py-16 lg:py-24 border-b border-slate-200/90 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Coverage & Classification
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Civic Infrastructure Categories
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Standardized issue classification mapped directly to municipal response units and automated SLA dispatch.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-white border border-slate-200 shadow-2xs">
                  {cat.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{cat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                <div className="pt-2 border-t border-slate-200/60 font-mono text-[11px] text-slate-500 font-medium">
                  {cat.sla}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Civic Karma Rewards Section */}
      <section className="py-16 lg:py-24 border-b border-slate-200/90 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 rounded bg-emerald-950 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <Award className="h-4 w-4" />
                <span>Civic Karma & Community Recognition</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Rewarding Verified Vigilance, Not Just Empty Noise
              </h2>

              <p className="text-sm text-slate-400 leading-relaxed">
                CitizenCivic incorporates a transparent civic ledger. Points are awarded exclusively for
                ground-truth actions: confirmed initial reports, accurate photos, verified resolution
                confirmations, and peer auditing.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Report Validated (+50 Pts)</h4>
                    <p className="text-[11px] text-slate-400">Awarded once municipal team acknowledges legitimate field issue.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Resolution Verified (+100 Pts)</h4>
                    <p className="text-[11px] text-slate-400">Awarded after on-ground confirmation that the location remains clean.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Peer Audit Follow-up (+75 Pts)</h4>
                    <p className="text-[11px] text-slate-400">Participating in the 7-day and 30-day hotspot recurrence inspections.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard simulation preview */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Community Leaderboard
                    </span>
                    <h4 className="text-sm font-bold text-white">Top Civic Guardians · Ward 82</h4>
                  </div>
                  <span className="font-mono text-xs text-slate-400">Updated Hourly</span>
                </div>

                <div className="divide-y divide-slate-800/80 mt-2">
                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-400">#01</span>
                      <div>
                        <div className="text-xs font-bold text-white">Dr. A. Kulkarni</div>
                        <div className="text-[10px] text-slate-400">18 Verified Closures · Indiranagar 100ft Rd</div>
                      </div>
                    </div>
                    <Badge variant="emerald" size="xs">
                      1,850 pts
                    </Badge>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-300">#02</span>
                      <div>
                        <div className="text-xs font-bold text-white">Priya N.</div>
                        <div className="text-[10px] text-slate-400">14 Verified Closures · Koramangala 4th Block</div>
                      </div>
                    </div>
                    <Badge variant="emerald" size="xs">
                      1,420 pts
                    </Badge>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-600">#03</span>
                      <div>
                        <div className="text-xs font-bold text-white">Karthik R.</div>
                        <div className="text-[10px] text-slate-400">11 Verified Closures · Defence Colony</div>
                      </div>
                    </div>
                    <Badge variant="emerald" size="xs">
                      1,150 pts
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <Link
                    to={user ? '/dashboard' : '/login'}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                  >
                    <span>View complete Ward 82 recognition roster</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) */}
      <section className="py-16 lg:py-24 border-b border-slate-200/90 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Institutional Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Everything you need to know about the verified resolution workflow, privacy protections,
              and dispute procedures.
            </p>
          </div>

          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between text-left cursor-pointer group"
                >
                  <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {faq.q}
                  </span>
                  <span className="ml-4 shrink-0 text-slate-400 group-hover:text-slate-700">
                    {openFaqIndex === idx ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>
                {openFaqIndex === idx && (
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 bg-slate-100 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            Ready to clean up and protect your neighborhood?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Join residents, community wardens, and municipal partners holding civic infrastructure
            to a higher standard of ground-truth accountability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="lg">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button variant="primary" size="lg">
                    Create Citizen Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg">
                    Municipal Staff Login
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
