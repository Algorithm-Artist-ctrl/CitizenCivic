import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function RotatingNetworkNodes() {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Generate deterministic civic resolution nodes
  const nodeCount = 36;
  const nodes = React.useMemo(() => {
    const pts: [number, number, number][] = [];
    const radius = 1.8;
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      pts.push([
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi),
      ]);
    }
    return pts;
  }, []);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (hovered ? 0.35 : 0.15);
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0008) * 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Subtle core mesh */}
      <mesh>
        <sphereGeometry args={[1.78, 16, 16]} />
        <meshBasicMaterial
          color="#064e3b"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Network Nodes */}
      {nodes.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial
            color={idx % 4 === 0 ? '#10b981' : idx % 3 === 0 ? '#34d399' : '#059669'}
          />
        </mesh>
      ))}
    </group>
  );
}

export const CivicSphere3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 ${className}`}>
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/20">
          <div className="h-24 w-24 rounded-full border border-emerald-400/40 animate-pulse" />
          <div className="absolute text-[11px] font-mono font-semibold text-emerald-400">
            WARD 82 MESH
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/90 shadow-2xl ${className}`}>
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-400">
          Ward 82 Municipal Grid
        </span>
      </div>

      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        style={{ width: '100%', height: '100%', minHeight: '260px' }}
      >
        <ambientLight intensity={0.6} />
        <RotatingNetworkNodes />
      </Canvas>

      <div className="absolute bottom-2.5 right-3.5 z-10 text-[10px] font-mono text-slate-400">
        36 Verified Nodes Active
      </div>
    </div>
  );
};

export default CivicSphere3D;
