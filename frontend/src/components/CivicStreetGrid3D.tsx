import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Detect WebGL capability safely
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

// Low-poly architectural building blocks representing Ward 82 street layout
interface BlockProps {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

const CityBlock = memo(({ position, size, color = '#e2e8f0' }: BlockProps) => {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
});

// Civic Issue Marker Pin
interface CivicPinProps {
  position: [number, number, number];
  status: 'OPEN' | 'RESOLVED';
  label?: string;
}

const CivicPin = memo(({ position, status }: CivicPinProps) => {
  const pinRef = useRef<THREE.Group>(null);
  const color = status === 'RESOLVED' ? '#10b981' : '#f59e0b';

  useFrame((state) => {
    if (pinRef.current) {
      // Gentle floating bob
      const t = state.clock.getElapsedTime();
      pinRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.05;
    }
  });

  return (
    <group ref={pinRef} position={position}>
      {/* Pin post */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshBasicMaterial color="#64748b" />
      </mesh>
      {/* Pin head */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Ground indicator ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.16, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

// Main 3D Municipal Scene
const MunicipalGridScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Precomputed street blocks (Indiranagar 100ft Rd / 12th Main layout)
  const blocks = useMemo<BlockProps[]>(() => {
    return [
      // Left Avenue blocks
      { position: [-2.2, 0.3, -1.8], size: [1.2, 0.6, 1.4], color: '#e2e8f0' },
      { position: [-2.2, 0.45, 0.2], size: [1.2, 0.9, 1.6], color: '#cbd5e1' },
      { position: [-2.2, 0.25, 2.0], size: [1.2, 0.5, 1.2], color: '#e2e8f0' },

      // Center-West block
      { position: [-0.6, 0.5, -1.8], size: [1.2, 1.0, 1.4], color: '#f1f5f9' },
      { position: [-0.6, 0.35, 0.2], size: [1.2, 0.7, 1.6], color: '#e2e8f0' },
      { position: [-0.6, 0.4, 2.0], size: [1.2, 0.8, 1.2], color: '#cbd5e1' },

      // Center-East block
      { position: [1.0, 0.4, -1.8], size: [1.2, 0.8, 1.4], color: '#e2e8f0' },
      { position: [1.0, 0.6, 0.2], size: [1.2, 1.2, 1.6], color: '#f8fafc' },
      { position: [1.0, 0.3, 2.0], size: [1.2, 0.6, 1.2], color: '#e2e8f0' },

      // Right Avenue blocks
      { position: [2.5, 0.35, -1.8], size: [1.1, 0.7, 1.4], color: '#cbd5e1' },
      { position: [2.5, 0.25, 0.2], size: [1.1, 0.5, 1.6], color: '#e2e8f0' },
      { position: [2.5, 0.45, 2.0], size: [1.1, 0.9, 1.2], color: '#f1f5f9' },
    ];
  }, []);

  // Subtle interactive rotation damping
  useFrame((state) => {
    if (groupRef.current) {
      // Slow baseline pan
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.08 - 0.25;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Street grid ribbons */}
      {/* Main Avenues (Z axis) */}
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

      {/* Cross Streets (X axis) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.8]}>
        <planeGeometry args={[8, 0.3]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.1]}>
        <planeGeometry args={[8, 0.3]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

      {/* Buildings */}
      {blocks.map((b, idx) => (
        <CityBlock key={idx} {...b} />
      ))}

      {/* Real-world illustrative municipal pins */}
      <CivicPin
        position={[0.2, 0, -0.8]}
        status="RESOLVED"
        label="100ft Rd / CMH Junction (Cleared)"
      />
      <CivicPin
        position={[-1.4, 0, 1.1]}
        status="OPEN"
        label="12th Main Footpath (In Progress)"
      />
      <CivicPin
        position={[1.8, 0, -0.2]}
        status="RESOLVED"
        label="Metro Pillar 45 (Verified)"
      />
      <CivicPin
        position={[0.2, 0, 2.0]}
        status="OPEN"
        label="7th Cross Corner (Dispatched)"
      />
    </group>
  );
};

import CivicStreetGridFallback from './CivicStreetGridFallback';
export { CivicStreetGridFallback };

export interface CivicStreetGrid3DProps {
  className?: string;
}

export const CivicStreetGrid3D: React.FC<CivicStreetGrid3DProps> = ({ className = 'h-72 w-full' }) => {
  const [canRender3D, setCanRender3D] = useState<boolean | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
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
    <div className={`relative rounded-xl border border-slate-200/90 bg-slate-50/60 overflow-hidden shadow-xs ${className}`}>
      {/* Topology Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-mono text-slate-600 shadow-2xs backdrop-blur-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
        <span>Ward 82 Grid Topology</span>
      </div>

      <Canvas
        camera={{ position: [0, 5.5, 6.5], fov: 32 }}
        shadows
        dpr={[1, 1.5]}
        className="cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
        <MunicipalGridScene />
      </Canvas>

      {/* Legend Footer */}
      <div className="absolute bottom-2 inset-x-3 z-10 flex items-center justify-between text-[11px] font-mono text-slate-500 bg-white/80 px-2.5 py-1 rounded border border-slate-200/80 backdrop-blur-xs">
        <span className="truncate">Bengaluru Municipal Sector: Indiranagar</span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Resolved
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(CivicStreetGrid3D);
