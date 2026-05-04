import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import { Clock, ChevronLeft, ChevronRight, Box } from 'lucide-react';

const QUARTERS = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];

const SEVERITY_COLORS = { Ringan: '#22C55E', Sedang: '#F59E0B', Parah: '#EF4444' };

const ASSET_3D_CONFIG = {
  'Lampu Jalan':      { color: '#FBBF24', component: 'lamp' },
  'Tiang Listrik':    { color: '#A78BFA', component: 'pole' },
  'Guardrail':        { color: '#CBD5E1', component: 'guardrail' },
  'Plang/Rambu':      { color: '#60A5FA', component: 'sign' },
  'Rambu Arah':       { color: '#34D399', component: 'sign' },
  'Rambu Peringatan': { color: '#F59E0B', component: 'sign' },
  'CCTV':             { color: '#34D399', component: 'cctv' },
  'Gantry Tol':       { color: '#F472B6', component: 'gantry' },
  'Pembatas Jalan':   { color: '#FB923C', component: 'barrier' },
  'Delineator':       { color: '#F97316', component: 'delineator' },
  'Marka Jalan':      { color: '#94A3B8', component: 'marker' },
  'Billboard':        { color: '#94A3B8', component: 'billboard' },
  'Videotron':        { color: '#64748B', component: 'billboard' },
  'Lainnya':          { color: '#94A3B8', component: 'pole' },
};

const ASSET_ICONS = {
  'Lampu Jalan': '💡', 'Tiang Listrik': '⚡', 'Guardrail': '🛡️', 'Plang/Rambu': '🪧',
  'Rambu Arah': '🛣️', 'Rambu Peringatan': '⚠️', 'CCTV': '📹', 'Gantry Tol': '🏗️',
  'Pembatas Jalan': '🚧', 'Delineator': '🔶', 'Marka Jalan': '〰️', 'Billboard': '📢',
  'Videotron': '📺', 'Lainnya': '📦',
};

export default function Road3DView({ segment, damages, assets = [], selectedQuarter, onQuarterChange, onMarkerClick }) {
  const filteredDamages = useMemo(
    () => damages.filter(d => d.quarter_period === selectedQuarter),
    [damages, selectedQuarter]
  );

  const currentQIdx = QUARTERS.indexOf(selectedQuarter);

  // Spread assets evenly along the road (X: -9 to 9)
  const positionedAssets = useMemo(() => {
    return assets.slice(0, 30).map((a, i) => ({
      ...a,
      _idx: i,
      xPos: (i / Math.max(assets.length - 1, 1)) * 18 - 9,
    }));
  }, [assets]);

  // Count assets by type for the legend
  const assetCounts = useMemo(() => {
    const c = {};
    assets.forEach(a => { c[a.asset_type] = (c[a.asset_type] || 0) + 1; });
    return c;
  }, [assets]);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-100 to-slate-200">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        {/* Status badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-1.5 flex items-center gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-surface-600">3D HISTORIS — {segment?.segment_name}</span>
        </div>

        {/* Counter badges */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <div className="bg-hka-red text-white rounded-lg shadow px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-xs font-semibold">{filteredDamages.length}</span>
            <span className="text-[10px]">kerusakan</span>
          </div>
          <div className="bg-blue-600 text-white rounded-lg shadow px-3 py-1.5 flex items-center gap-1.5">
            <Box size={12} />
            <span className="text-xs font-semibold">{assets.length}</span>
            <span className="text-[10px]">aset</span>
          </div>
        </div>

        {/* Asset legend panel */}
        {assets.length > 0 && (
          <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2.5 z-10 border border-surface-200 max-w-[190px]">
            <p className="text-[9px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Aset di Segmen</p>
            {Object.entries(assetCounts).slice(0, 6).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 py-0.5">
                <span className="text-xs">{ASSET_ICONS[type] || '📦'}</span>
                <span className="text-[10px] text-surface-600 flex-1 truncate">{type}</span>
                <span className="text-[9px] font-bold text-surface-400">{count}</span>
              </div>
            ))}
          </div>
        )}

        <Canvas camera={{ position: [0, 8, 14], fov: 50 }} shadows
          style={{ background: 'linear-gradient(to bottom, #C7D2FE, #E2E8F0)' }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-mapSize={1024} />
          <pointLight position={[-5, 10, -5]} intensity={0.4} color="#F6BF15" />

          <OrbitControls makeDefault enablePan enableZoom enableRotate
            minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.2} minDistance={5} maxDistance={30} />

          {/* Road surface */}
          <RoadSurface />
          <RoadMarkings />

          {/* Static guardrails */}
          <GuardRail position={[0, 0.15, 1.8]} />
          <GuardRail position={[0, 0.15, -1.8]} />

          {/* ── CV-DETECTED ASSETS ── */}
          {positionedAssets.map((asset, i) => (
            <AssetObject key={`asset-${asset.id}-${i}`} asset={asset} />
          ))}

          {/* ── DAMAGE MARKERS ── */}
          {filteredDamages.map((d, i) => (
            <DamagePin key={d.id} damage={d} index={i} total={filteredDamages.length}
              onClick={() => onMarkerClick(d)} />
          ))}

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#CBD5E1" />
          </mesh>

          <ContactShadows position={[0, -0.04, 0]} scale={30} blur={2} far={5} opacity={0.3} />
        </Canvas>
      </div>

      {/* Timeline Slider */}
      <div className="shrink-0 bg-white border-t border-surface-200 px-5 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Clock size={14} className="text-surface-400" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Historis Kerusakan</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => currentQIdx > 0 && onQuarterChange(QUARTERS[currentQIdx - 1])}
            disabled={currentQIdx <= 0}
            className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronLeft size={16} className="text-surface-500" />
          </button>
          <div className="flex-1 flex gap-1.5">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => onQuarterChange(q)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                  ${selectedQuarter === q ? 'bg-hka-red text-white shadow-sm shadow-hka-red/30' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'}`}>
                {q}
              </button>
            ))}
          </div>
          <button onClick={() => currentQIdx < QUARTERS.length - 1 && onQuarterChange(QUARTERS[currentQIdx + 1])}
            disabled={currentQIdx >= QUARTERS.length - 1}
            className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronRight size={16} className="text-surface-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ ROAD PARTS ══════════════════ */

function RoadSurface() {
  return (
    <group>
      <RoundedBox args={[20, 0.15, 3.2]} radius={0.03} position={[0, 0.075, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[20, 0.12, 0.6]} radius={0.02} position={[0, 0.06, 2.1]} receiveShadow>
        <meshStandardMaterial color="#64748B" roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[20, 0.12, 0.6]} radius={0.02} position={[0, 0.06, -2.1]} receiveShadow>
        <meshStandardMaterial color="#64748B" roughness={0.95} />
      </RoundedBox>
    </group>
  );
}

function GuardRail({ position }) {
  return (
    <group position={position}>
      {Array.from({ length: 11 }).map((_, i) => (
        <group key={i} position={[i * 2 - 10, 0, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.4} />
          </mesh>
          {i < 10 && (
            <mesh position={[1, 0.4, 0]}>
              <boxGeometry args={[2, 0.08, 0.04]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.7} roughness={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function RoadMarkings() {
  return (
    <group position={[0, 0.16, 0]}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[i * 2 - 9, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.12]} />
          <meshStandardMaterial color="#F6BF15" emissive="#F6BF15" emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 0.1]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0, -1.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 0.1]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

/* ══════════════════ ASSET 3D OBJECTS ══════════════════ */

function AssetObject({ asset }) {
  const cfg = ASSET_3D_CONFIG[asset.asset_type] || { color: '#94A3B8', component: 'pole' };
  const condColor = asset.condition === 'Baik' ? '#22C55E' : asset.condition === 'Rusak Ringan' ? '#F59E0B' : '#EF4444';
  const x = asset.xPos ?? 0;
  // Alternate side: even = left side of road (z=2.5), odd = right (z=-2.5)
  const zSide = asset._idx % 2 === 0 ? 2.5 : -2.5;

  switch (cfg.component) {
    case 'lamp':     return <LampPost3D x={x} z={zSide} color={cfg.color} condColor={condColor} label={asset.asset_type} />;
    case 'cctv':     return <CCTV3D x={x} z={zSide} color={cfg.color} condColor={condColor} />;
    case 'sign':     return <Sign3D x={x} z={zSide} color={cfg.color} condColor={condColor} label={ASSET_ICONS[asset.asset_type] || '🪧'} />;
    case 'gantry':   return <Gantry3D x={x} color={cfg.color} condColor={condColor} />;
    case 'barrier':  return <Barrier3D x={x} condColor={condColor} />;
    case 'delineator': return <Delineator3D x={x} z={zSide} condColor={condColor} />;
    default:         return <GenericPole3D x={x} z={zSide} color={cfg.color} condColor={condColor} />;
  }
}

// Wrap with index tracking
function AssetObject_({ asset, index }) {
  return <AssetObject asset={{ ...asset, _idx: index }} />;
}

// Lamp post
function LampPost3D({ x, z, color, condColor }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.0, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.4, 2.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Light head */}
      <mesh position={[0.8, 2.9, 0]} castShadow>
        <boxGeometry args={[0.4, 0.15, 0.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      {/* Condition dot */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// CCTV
function CCTV3D({ x, z, color, condColor }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 3.0, 8]} />
        <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Camera bracket */}
      <mesh position={[0, 2.9, 0]} rotation={[0, 0, Math.PI / 8]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Camera body */}
      <mesh position={[0.15, 3.1, 0]} castShadow>
        <boxGeometry args={[0.3, 0.14, 0.14]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Lens */}
      <mesh position={[0.31, 3.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.06, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Status indicator */}
      <mesh position={[0, 3.3, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// Road sign
function Sign3D({ x, z, color, condColor, label }) {
  return (
    <group position={[x, 0, z]}>
      {/* Post */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.0, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Condition strip */}
      <mesh position={[0, 2.15, 0.025]}>
        <boxGeometry args={[0.6, 0.06, 0.01]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// Gantry toll
function Gantry3D({ x, color, condColor }) {
  return (
    <group position={[x, 0, 0]}>
      {/* Left pillar */}
      <mesh position={[-0.1, 2.0, 2.4]} castShadow>
        <boxGeometry args={[0.2, 4.0, 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[-0.1, 2.0, -2.4]} castShadow>
        <boxGeometry args={[0.2, 4.0, 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Horizontal beam */}
      <mesh position={[-0.1, 4.0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 5.2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Sign panel */}
      <mesh position={[-0.25, 3.6, 0]}>
        <boxGeometry args={[0.04, 0.6, 4.0]} />
        <meshStandardMaterial color="#1E293B" />
      </mesh>
      {/* Status light */}
      <mesh position={[-0.3, 4.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

// Median barrier
function Barrier3D({ x, condColor }) {
  return (
    <group position={[x, 0.08, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.7, 0.35]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.9} />
      </mesh>
      {/* Condition stripe */}
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.8, 0.05, 0.36]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// Delineator post
function Delineator3D({ x, z, condColor }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#F97316" />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Generic pole fallback
function GenericPole3D({ x, z, color, condColor }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 2.4, 8]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color={condColor} emissive={condColor} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/* ══════════════════ DAMAGE PIN ══════════════════ */

function DamagePin({ damage, index, total, onClick }) {
  const ref = useRef();
  const color = SEVERITY_COLORS[damage.severity] || '#94A3B8';
  const xPos = (damage.distance_meter / 1000) * 18 - 9;
  const zPos = (index % 3 - 1) * 0.5;

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  return (
    <group position={[xPos, 0, zPos]} onClick={onClick}>
      {/* Pole */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Floating head */}
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
        <Billboard follow>
          <Text position={[0, 0.35, 0]} fontSize={0.18} color="#334155" anchorX="center" anchorY="bottom">
            {damage.distance_meter}m
          </Text>
        </Billboard>
      </group>
      {/* Road spot */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
