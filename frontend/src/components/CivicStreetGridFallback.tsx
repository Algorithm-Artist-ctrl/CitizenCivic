import React from 'react';

// Crisp 2D isometric architectural SVG fallback when WebGL is unavailable or user prefers reduced motion
export const CivicStreetGridFallback: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center ${className}`}
    >
      <svg
        viewBox="0 0 320 220"
        className="h-44 w-auto text-slate-300 mx-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Isometric street grid */}
        <path d="M160 20 L290 85 L160 150 L30 85 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
        <path d="M160 55 L255 102 L160 150 L65 102 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Building blocks */}
        <polygon points="90,90 120,75 120,105 90,120" fill="#cbd5e1" />
        <polygon points="120,75 150,90 150,120 120,105" fill="#94a3b8" />
        <polygon points="90,90 120,75 150,90 120,105" fill="#e2e8f0" />

        <polygon points="180,95 210,80 210,120 180,135" fill="#cbd5e1" />
        <polygon points="210,80 240,95 240,135 210,120" fill="#94a3b8" />
        <polygon points="180,95 210,80 240,95 210,110" fill="#f1f5f9" />

        {/* Resolved Green Pin */}
        <circle cx="160" cy="115" r="5" fill="#10b981" />
        <circle cx="160" cy="115" r="9" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />

        {/* Open Amber Pin */}
        <circle cx="115" cy="135" r="5" fill="#f59e0b" />
        <circle cx="115" cy="135" r="9" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
      </svg>
      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Verified Resolved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Active Defect
        </span>
      </div>
    </div>
  );
};

export default CivicStreetGridFallback;
