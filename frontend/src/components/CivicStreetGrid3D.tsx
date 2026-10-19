import React, { useState, useEffect, useMemo, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Case } from '../types';
import CivicStreetGridFallback from './CivicStreetGridFallback';

export { CivicStreetGridFallback };

// Safe WebGL capability detection
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Low-poly architectural building blocks representing Ward 82 layout
interface BlockProps {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

const CityBlock = memo(({ position, size, color = '#e2e8f0' }: BlockProps) => {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.05}
        flatShading
      />
    </mesh>
  );
});

// Civic Marker Pin connected 100% to a genuine database case record
interface RealCivicPinProps {
  c: Case;
  position: [number, number, number];
  isSelected: boolean;
  onSelect?: (id: string) => void;
}

const RealCivicPin = memo(({ c, position, isSelected, onSelect }: RealCivicPinProps) => {
  const [hovered, setHovered] = useState(false);

  // Status color mapping based on genuine database case status
  const color = useMemo(() => {
    switch (c.status) {
      case 'VERIFIED_RESOLVED':
        return '#047857'; // emerald-700
      case 'IN_PROGRESS':
      case 'ACKNOWLEDGED':
        return '#d97706'; // amber-600
      case 'VERIFICATION_PENDING':
        return '#7c3aed'; // purple-600
      case 'DISPUTED_CLOSURE':
        return '#dc2626'; // rose-600
      default:
        return '#2563eb'; // blue-600
    }
  }, [c.status]);

  const scale = isSelected ? 1.25 : hovered ? 1.15 : 1.0;

  return (
    <group
      position={position}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect(c.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Pin post */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
        <meshBasicMaterial color="#64748b" />
      </mesh>

      {/* Pin head */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Ground ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 24]} />
        <meshBasicMaterial color={color} transparent opacity={isSelected ? 0.9 : 0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Interactive Tooltip on Hover or Selection */}
      {(hovered || isSelected) && (
        <Html position={[0, 1.1, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="pointer-events-none rounded border border-slate-200 bg-white px-2 py-1 shadow-md text-center whitespace-nowrap font-sans">
            <span className="block font-mono text-[10px] font-bold text-slate-900 leading-tight">
              {c.case_number}
            </span>
            <span className="block text-[9px] text-slate-500 truncate max-w-[140px]">
              {c.landmark || c.category?.name_en || 'Case Record'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
});

// Scene Component with Street Ribbons and Dynamic Case Markers
interface SceneProps {
  cases: Case[];
  selectedCaseId?: string | null;
  onSelectCase?: (id: string) => void;
}

const MunicipalGridScene: React.FC<SceneProps> = ({ cases, selectedCaseId, onSelectCase }) => {
  // Low-poly architectural blocks for Indiranagar Ward 82 layout
  const blocks = useMemo<BlockProps[]>(() => {
    return [
      { position: [-2.2, 0.3, -1.8], size: [1.2, 0.6, 1.4], color: '#e2e8f0' },
      { position: [-2.2, 0.45, 0.2], size: [1.2, 0.9, 1.6], color: '#cbd5e1' },
      { position: [-2.2, 0.25, 2.0], size: [1.2, 0.5, 1.2], color: '#e2e8f0' },

      { position: [-0.6, 0.5, -1.8], size: [1.2, 1.0, 1.4], color: '#f1f5f9' },
      { position: [-0.6, 0.35, 0.2], size: [1.2, 0.7, 1.6], color: '#e2e8f0' },
      { position: [-0.6, 0.4, 2.0], size: [1.2, 0.8, 1.2], color: '#cbd5e1' },

      { position: [1.0, 0.35, -1.8], size: [1.2, 0.7, 1.4], color: '#cbd5e1' },
      { position: [1.0, 0.55, 0.2], size: [1.2, 1.1, 1.6], color: '#e2e8f0' },
      { position: [1.0, 0.3, 2.0], size: [1.2, 0.6, 1.2], color: '#f1f5f9' },

      { position: [2.5, 0.25, -1.8], size: [1.0, 0.5, 1.4], color: '#e2e8f0' },
      { position: [2.5, 0.4, 0.2], size: [1.0, 0.8, 1.6], color: '#cbd5e1' },
      { position: [2.5, 0.25, 2.0], size: [1.0, 0.5, 1.2], color: '#e2e8f0' },
    ];
  }, []);

  // Map real database case coordinates onto the local grid
  // Reference center: Indiranagar Ward 82 (lat: 12.9784, lng: 77.6408)
  const casePins = useMemo(() => {
    return cases.map((c, idx) => {
      let x = 0;
      let z = 0;

      if (c.latitude && c.longitude) {
        // Compute delta from Ward 82 center and project to 3D grid
        x = (c.longitude - 77.6408) * 120;
        z = (12.9784 - c.latitude) * 120;

        // Clamp to grid boundaries
        x = Math.max(-2.5, Math.min(2.5, x));
        z = Math.max(-2.2, Math.min(2.2, z));
      } else {
        // Fallback positional distribution along street intersections if GPS missing
        const positions: [number, number][] = [
          [0.2, -0.8],
          [-1.4, 1.1],
          [1.8, -0.2],
          [0.2, 2.0],
        ];
        const pos = positions[idx % positions.length];
        x = pos[0];
        z = pos[1];
      }

      return {
        c,
        position: [x, 0, z] as [number, number, number],
      };
    });
  }, [cases]);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Street ribbons (Avenues on Z axis, Cross Streets on X axis) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.4, 0.005, 0]}>
        <planeGeometry args={[0.3, 8]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.005, 0]}>
        <planeGeometry args={[0.35, 8]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.8, 0.005, 0]}>
        <planeGeometry args={[0.3, 8]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.8]}>
        <planeGeometry args={[8, 0.3]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.1]}>
        <planeGeometry args={[8, 0.3]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

      {/* Architectural Blocks */}
      {blocks.map((b, idx) => (
        <CityBlock key={idx} {...b} />
      ))}

      {/* Case Pins Generated STRICTLY from Real Database Records */}
      {casePins.map(({ c, position }) => (
        <RealCivicPin
          key={c.id}
          c={c}
          position={position}
          isSelected={c.id === selectedCaseId}
          onSelect={onSelectCase}
        />
      ))}
    </group>
  );
};

export interface CivicStreetGrid3DProps {
  className?: string;
  cases?: Case[];
  selectedCaseId?: string | null;
  onSelectCase?: (caseId: string) => void;
}

export const CivicStreetGrid3D: React.FC<CivicStreetGrid3DProps> = ({
  className = 'h-72 w-full',
  cases = [],
  selectedCaseId = null,
  onSelectCase,
}) => {
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null);

  useEffect(() => {
    // Check reduced motion preference and WebGL availability
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !isWebGLAvailable()) {
      setCanRender3D(false);
      return;
    }
    setCanRender3D(true);
  }, []);

  if (canRender3D === false || canRender3D === null) {
    return <CivicStreetGridFallback className={className} />;
  }

  return (
    <div className={`relative rounded-xl border border-slate-200/90 bg-slate-50/60 overflow-hidden shadow-2xs select-none ${className}`}>
      {/* Topology Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-mono text-slate-700 shadow-2xs backdrop-blur-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        <span>Illustrative Spatial Grid · {cases.length} Real Cases</span>
      </div>

      <Canvas
        camera={{ position: [0, 5.5, 6.5], fov: 32 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        className="cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.9} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.8}
          minDistance={4}
          maxDistance={12}
          dampingFactor={0.05}
        />
        <MunicipalGridScene
          cases={cases}
          selectedCaseId={selectedCaseId}
          onSelectCase={onSelectCase}
        />
      </Canvas>

      {/* Legend Footer */}
      <div className="absolute bottom-2 inset-x-3 z-10 flex items-center justify-between text-[11px] font-mono text-slate-600 bg-white/90 px-2.5 py-1 rounded border border-slate-200 backdrop-blur-xs">
        <span className="truncate">Illustrative Model · Relative Case Coordinates</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" /> Resolved
          </span>
          <span className="flex items-center gap-1 text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(CivicStreetGrid3D);
