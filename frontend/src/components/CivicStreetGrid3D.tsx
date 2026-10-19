import React, { useState, useEffect, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Trash2,
  Droplets,
  CheckCircle2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

// Low-poly Stylized Tree
interface TreeProps {
  position: [number, number, number];
  scale?: number;
  variant?: 'deciduous' | 'pine';
}

const Tree = memo(({ position, scale = 1, variant = 'deciduous' }: TreeProps) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.32, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Foliage */}
      {variant === 'pine' ? (
        <group position={[0, 0.42, 0]}>
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[0.18, 0.36, 6]} />
            <meshStandardMaterial color="#047857" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.14, 0.3, 6]} />
            <meshStandardMaterial color="#059669" roughness={0.8} flatShading />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.2, 7, 7]} />
          <meshStandardMaterial color="#10b981" roughness={0.8} flatShading />
        </mesh>
      )}
    </group>
  );
});

// Modern Low-Poly Building
interface BuildingProps {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  glassColor?: string;
  roofFeature?: 'terrace' | 'solar' | 'spire' | 'stepped' | 'plain';
}

const Building = memo(({
  position,
  size,
  color = '#f8fafc',
  glassColor,
  roofFeature = 'plain',
}: BuildingProps) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      {/* Main Building Body */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} flatShading />
      </mesh>

      {/* Optional Reflective Glass Band */}
      {glassColor && (
        <mesh position={[0, h * 0.55, d / 2 + 0.005]}>
          <planeGeometry args={[w * 0.85, h * 0.7]} />
          <meshStandardMaterial
            color={glassColor}
            roughness={0.2}
            metalness={0.4}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Architectural Roof Features */}
      {roofFeature === 'terrace' && (
        <group position={[0, h, 0]}>
          {/* Green lawn on roof */}
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[w * 0.85, 0.02, d * 0.85]} />
            <meshStandardMaterial color="#10b981" roughness={0.9} />
          </mesh>
          {/* Small rooftop pergola */}
          <mesh position={[w * 0.2, 0.1, d * 0.2]}>
            <boxGeometry args={[w * 0.35, 0.18, d * 0.35]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
        </group>
      )}

      {roofFeature === 'solar' && (
        <mesh position={[0, h + 0.03, 0]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[w * 0.8, 0.02, d * 0.7]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.2} metalness={0.6} />
        </mesh>
      )}

      {roofFeature === 'spire' && (
        <mesh position={[0, h + 0.3, 0]}>
          <cylinderGeometry args={[0.015, 0.03, 0.6, 6]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
      )}

      {roofFeature === 'stepped' && (
        <mesh position={[0, h + 0.1, 0]}>
          <boxGeometry args={[w * 0.7, 0.2, d * 0.7]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
});

// Street Lamppost with Warm Emissive Bulb
const StreetLight = memo(({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Pole */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.4, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.06, 0.4, 0]}>
        <boxGeometry args={[0.12, 0.015, 0.015]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0.11, 0.38, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
});

// Miniature Car
const MiniCar = memo(({ position, color = '#2563eb', rotation = [0, 0, 0] }: { position: [number, number, number]; color?: string; rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Body */}
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.26]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.08, -0.01]}>
        <boxGeometry args={[0.11, 0.045, 0.14]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
});

// Soft Floating Cloud
const Cloud = memo(({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[0.16, -0.04, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[-0.15, -0.03, 0.04]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[0.02, 0.08, -0.05]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
    </group>
  );
});

// Prominent Central Emerald Location Pin with Concentric Glowing Ground Rings
const CentralEmeraldPin = memo(() => {
  return (
    <group position={[0, 0, -0.15]}>
      {/* Slender Needle Post */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.018, 0.032, 0.72, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Emerald Green Sphere Head */}
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial
          color="#059669"
          emissive="#10b981"
          emissiveIntensity={0.25}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Little Inner White Accent Dot */}
      <mesh position={[0, 0.82, 0.14]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Ground Concentric Pulse Rings */}
      {/* Ring 1 (Inner) */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 2 (Middle) */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.48, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 3 (Outer) */}
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.73, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

// Complete Miniature Isometric City Scene
interface MunicipalSceneProps {
  cases?: Case[];
  selectedCaseId?: string | null;
  onSelectCase?: (id: string) => void;
}

const MunicipalCityScene: React.FC<MunicipalSceneProps> = () => {
  return (
    <group>
      {/* 1. Raised Civic Precinct Foundation Slab */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[7.2, 0.4, 7.2]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Ground Precinct Pavement Top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[7.0, 7.0]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* 2. Blue Water Canal / River Channel */}
      {/* Canal Bed Trench */}
      <mesh position={[0, -0.05, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.0, 1.1]} />
        <meshStandardMaterial color="#0284c7" roughness={0.15} metalness={0.3} transparent opacity={0.92} />
      </mesh>

      {/* Stone Embankment Walls */}
      <mesh position={[0, 0.02, 0.82]}>
        <boxGeometry args={[7.0, 0.05, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 1.98]}>
        <boxGeometry args={[7.0, 0.05, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* 3. Arched Concrete Bridge spanning the Canal */}
      <group position={[0, 0.06, 1.4]}>
        {/* Bridge Deck */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.9, 0.07, 1.22]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Asphalt road on bridge */}
        <mesh position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.76, 1.2]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {/* Left Guard Railing */}
        <mesh position={[-0.42, 0.07, 0]}>
          <boxGeometry args={[0.05, 0.12, 1.22]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Right Guard Railing */}
        <mesh position={[0.42, 0.07, 0]}>
          <boxGeometry args={[0.05, 0.12, 1.22]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* 4. Roads Network (Asphalt ribbons) */}
      {/* North-South Main Avenue (Crosses Bridge) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -0.9]}>
        <planeGeometry args={[0.8, 3.4]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 2.7]}>
        <planeGeometry args={[0.8, 1.4]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* East-West Cross Boulevard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -1.0]}>
        <planeGeometry args={[7.0, 0.8]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* White Road Lane Strips & Crosswalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.8, 0.008, -1.0]}>
        <planeGeometry args={[1.6, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.8, 0.008, -1.0]}>
        <planeGeometry args={[1.6, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Pedestrian Zebra Crosswalk at Intersection */}
      {[-0.2, -0.1, 0, 0.1, 0.2].map((offset, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[offset, 0.008, -0.55]}>
          <planeGeometry args={[0.06, 0.18]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* 5. Modern Architecture & Buildings */}
      {/* Municipal Civic Headquarters (North Center) */}
      <Building
        position={[0, 0, -2.3]}
        size={[1.6, 1.5, 1.2]}
        color="#ffffff"
        glassColor="#38bdf8"
        roofFeature="stepped"
      />

      {/* Commercial Glass Tower (Northwest) */}
      <Building
        position={[-2.1, 0, -2.2]}
        size={[1.1, 2.3, 1.1]}
        color="#1e293b"
        glassColor="#60a5fa"
        roofFeature="spire"
      />

      {/* Modern High-Rise Tower (Northeast) */}
      <Building
        position={[2.1, 0, -2.2]}
        size={[1.1, 1.9, 1.1]}
        color="#f8fafc"
        glassColor="#0284c7"
        roofFeature="solar"
      />

      {/* Residential Terraced Apartment Block (West Sector) */}
      <Building
        position={[-2.2, 0, 0.0]}
        size={[1.2, 0.95, 1.3]}
        color="#e2e8f0"
        roofFeature="terrace"
      />

      {/* Contemporary Mid-Rise Townhouses (East Sector) */}
      <Building
        position={[2.2, 0, -0.05]}
        size={[1.2, 0.85, 1.2]}
        color="#f8fafc"
        roofFeature="solar"
      />

      {/* Waterfront Promenade Pavilion 1 (Southwest) */}
      <Building
        position={[-2.0, 0, 2.7]}
        size={[1.3, 0.45, 0.8]}
        color="#ffffff"
        glassColor="#38bdf8"
        roofFeature="terrace"
      />

      {/* Waterfront Promenade Pavilion 2 (Southeast) */}
      <Building
        position={[2.0, 0, 2.7]}
        size={[1.3, 0.45, 0.8]}
        color="#f1f5f9"
        glassColor="#38bdf8"
        roofFeature="plain"
      />

      {/* 6. Green Parks & Lawns */}
      {/* Central Civic Square & Lawn */}
      <mesh position={[0, 0.008, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.0]} />
        <meshStandardMaterial color="#10b981" roughness={0.85} />
      </mesh>

      {/* Pocket Park (Northwest corner of intersection) */}
      <mesh position={[-1.0, 0.008, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.6]} />
        <meshStandardMaterial color="#059669" roughness={0.85} />
      </mesh>

      {/* Waterfront Promenade Green Strip */}
      <mesh position={[-0.8, 0.008, 2.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshStandardMaterial color="#10b981" roughness={0.85} />
      </mesh>
      <mesh position={[0.8, 0.008, 2.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshStandardMaterial color="#10b981" roughness={0.85} />
      </mesh>

      {/* 7. Stylized Low-Poly Trees */}
      <Tree position={[-0.6, 0, 0.35]} variant="deciduous" scale={1.1} />
      <Tree position={[0.6, 0, 0.35]} variant="deciduous" scale={1.0} />
      <Tree position={[-0.5, 0, -0.2]} variant="pine" scale={0.9} />
      <Tree position={[0.5, 0, -0.2]} variant="deciduous" scale={1.05} />

      <Tree position={[-1.1, 0, -1.8]} variant="pine" scale={1.1} />
      <Tree position={[-0.8, 0, -1.6]} variant="deciduous" scale={0.95} />

      <Tree position={[-1.2, 0, 0.4]} variant="deciduous" scale={1.0} />
      <Tree position={[1.2, 0, 0.4]} variant="deciduous" scale={0.9} />

      <Tree position={[-0.8, 0, 2.8]} variant="deciduous" scale={1.0} />
      <Tree position={[0.8, 0, 2.8]} variant="pine" scale={1.0} />

      <Tree position={[-3.0, 0, -2.8]} variant="pine" scale={1.15} />
      <Tree position={[3.0, 0, -2.8]} variant="deciduous" scale={1.1} />

      {/* 8. Miniature City Vehicles */}
      {/* Electric Blue Commuter Car */}
      <MiniCar position={[0.22, 0, 0.4]} color="#2563eb" rotation={[0, 0, 0]} />
      {/* Yellow Municipal Service Van */}
      <MiniCar position={[-0.22, 0, -1.8]} color="#f59e0b" rotation={[0, Math.PI, 0]} />
      {/* White Clean Energy Sedan */}
      <MiniCar position={[1.8, 0, -0.82]} color="#ffffff" rotation={[0, Math.PI / 2, 0]} />

      {/* 9. Streetlights along Avenue */}
      <StreetLight position={[-0.48, 0, -0.3]} rotation={[0, Math.PI / 2, 0]} />
      <StreetLight position={[0.48, 0, -0.3]} rotation={[0, -Math.PI / 2, 0]} />
      <StreetLight position={[-0.48, 0, 2.4]} rotation={[0, Math.PI / 2, 0]} />
      <StreetLight position={[0.48, 0, 2.4]} rotation={[0, -Math.PI / 2, 0]} />

      {/* 10. Prominent Central Emerald Location Pin & Concentric Pulse Rings */}
      <CentralEmeraldPin />

      {/* 11. Soft Atmospheric Clouds hovering over platform borders */}
      <Cloud position={[-2.8, 2.3, -1.8]} scale={1.1} />
      <Cloud position={[2.9, 2.5, 0.5]} scale={1.0} />
      <Cloud position={[-1.2, 2.4, 3.1]} scale={0.95} />
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
  className = 'h-[460px] w-full',
  cases = [],
  selectedCaseId = null,
  onSelectCase,
}) => {
  const { t } = useTranslation();
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
    <div className={`relative rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/40 overflow-hidden shadow-md select-none ${className}`}>
      {/* Atmospheric Header Badge */}
      <div className="absolute top-3.5 left-4 z-20 flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1 text-xs font-mono text-slate-800 shadow-xs backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
        <span className="font-semibold">{t('landing.scene.locationPin') || 'Central Ward Node'}</span>
        <span className="text-slate-400">·</span>
        <span className="text-[11px] text-slate-500 font-sans">{t('landing.scene.illustrativeTitle') || 'Illustrative Isometric Ward Model'}</span>
      </div>

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [6.5, 6.8, 6.5], fov: 32 }}
        dpr={[1, 1.5]}
        className="cursor-grab active:cursor-grabbing w-full h-full"
      >
        <ambientLight intensity={0.8} color="#f8fafc" />
        <directionalLight position={[8, 12, 6]} intensity={1.15} color="#fffbeb" />
        <hemisphereLight groundColor="#94a3b8" color="#e0f2fe" intensity={0.4} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 4.2}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={5}
          maxDistance={11}
          dampingFactor={0.05}
          autoRotate={false}
        />

        <MunicipalCityScene
          cases={cases}
          selectedCaseId={selectedCaseId}
          onSelectCase={onSelectCase}
        />
      </Canvas>

      {/* 3 FLOATING CIVIC ISSUE CARDS OVER THE 3D SCENE */}
      {/* 1. Garbage Accumulation Card (Top-Left) */}
      <div className="absolute top-14 left-4 z-20 pointer-events-auto animate-float hidden sm:block">
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/90 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-md hover:shadow-lg transition-shadow max-w-[230px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded font-semibold">
                {t('landing.scene.exampleIssue') || 'Example issue'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {t('landing.scene.garbage') || 'Garbage Accumulation'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {t('landing.scene.garbageStatus') || 'Reported · Under Review'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Water Logging Card (Bottom-Left) */}
      <div className="absolute bottom-12 left-4 z-20 pointer-events-auto animate-float-delayed hidden sm:block">
        <div className="flex items-center gap-3 rounded-xl border border-sky-200/90 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-md hover:shadow-lg transition-shadow max-w-[230px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80">
            <Droplets className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-800 bg-sky-100/70 px-1.5 py-0.2 rounded font-semibold">
                {t('landing.scene.exampleIssue') || 'Example issue'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {t('landing.scene.water') || 'Water Logging'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {t('landing.scene.waterStatus') || 'Dispatched · In Progress'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Street Light Fixed Card (Top-Right) */}
      <div className="absolute top-14 right-4 z-20 pointer-events-auto animate-float-alt hidden sm:block">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200/90 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-md hover:shadow-lg transition-shadow max-w-[240px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded font-semibold">
                {t('landing.scene.exampleIssue') || 'Example issue'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {t('landing.scene.light') || 'Street Light Fixed'}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold truncate">
              {t('landing.scene.lightStatus') || 'Verified Resolved'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Spatial Footnote */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center justify-between text-[11px] font-mono text-slate-600 bg-white/90 px-3 py-1.5 rounded-lg border border-slate-200/80 backdrop-blur-md">
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
          <span>{t('landing.scene.orbitHint') || 'Drag to orbit precinct · Scroll to zoom'}</span>
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="flex items-center gap-1 text-emerald-800 font-semibold">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            <span>Interactive 3D</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(CivicStreetGrid3D);
