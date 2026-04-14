import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const QUARTERS = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];

const SEVERITY_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah: '#EF4444',
};

const DAMAGE_TYPE_SHAPES = {
  'Retak Memanjang': 'cylinder',
  'Retak Melintang': 'cylinder',
  'Retak Buaya': 'box',
  'Lubang': 'sphere',
};

export default function Road3DView({ segment, damages, selectedQuarter, onQuarterChange, onMarkerClick }) {
  const filteredDamages = useMemo(
    () => damages.filter(d => d.quarter_period === selectedQuarter),
    [damages, selectedQuarter]
  );

  const currentQIdx = QUARTERS.indexOf(selectedQuarter);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-surface-100 to-surface-200">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        {/* Status badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-1.5 flex items-center gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-surface-600">
            3D HISTORIS — {segment?.segment_name}
          </span>
        </div>

        {/* Damage count badge */}
        <div className="absolute top-4 right-4 bg-hka-red text-white rounded-lg shadow px-3 py-1.5 flex items-center gap-1.5 z-10">
          <span className="text-xs font-semibold">{filteredDamages.length}</span>
          <span className="text-[10px]">titik rusak</span>
        </div>

        <Canvas
          camera={{ position: [0, 8, 14], fov: 50 }}
          shadows
          style={{ background: 'linear-gradient(to bottom, #E2E8F0, #F1F5F9)' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-mapSize={1024} />
          <pointLight position={[-5, 10, -5]} intensity={0.4} color="#F6BF15" />

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={5}
            maxDistance={30}
          />

          {/* Road surface */}
          <RoadSurface />

          {/* Guard rails */}
          <GuardRail position={[0, 0.15, 1.8]} />
          <GuardRail position={[0, 0.15, -1.8]} />

          {/* Road markings */}
          <RoadMarkings />

          {/* Damage markers */}
          {filteredDamages.map((d, i) => (
            <DamagePin
              key={d.id}
              damage={d}
              index={i}
              total={filteredDamages.length}
              onClick={() => onMarkerClick(d)}
            />
          ))}

          {/* Ground plane */}
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
          <button
            onClick={() => currentQIdx > 0 && onQuarterChange(QUARTERS[currentQIdx - 1])}
            disabled={currentQIdx <= 0}
            className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} className="text-surface-500" />
          </button>

          <div className="flex-1 flex gap-1.5">
            {QUARTERS.map((q, i) => (
              <button
                key={q}
                onClick={() => onQuarterChange(q)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                  ${selectedQuarter === q
                    ? 'bg-hka-red text-white shadow-sm shadow-hka-red/30'
                    : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                  }`}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            onClick={() => currentQIdx < QUARTERS.length - 1 && onQuarterChange(QUARTERS[currentQIdx + 1])}
            disabled={currentQIdx >= QUARTERS.length - 1}
            className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronRight size={16} className="text-surface-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- 3D Sub-components ---- */

function RoadSurface() {
  return (
    <group>
      {/* Main road */}
      <RoundedBox args={[20, 0.15, 3.2]} radius={0.03} position={[0, 0.075, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </RoundedBox>
      {/* Shoulder left */}
      <RoundedBox args={[20, 0.12, 0.6]} radius={0.02} position={[0, 0.06, 2.1]} receiveShadow>
        <meshStandardMaterial color="#64748B" roughness={0.95} />
      </RoundedBox>
      {/* Shoulder right */}
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
          {/* Post */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Rail */}
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
      {/* Center dashed line */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[i * 2 - 9, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.12]} />
          <meshStandardMaterial color="#F6BF15" emissive="#F6BF15" emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* Edge lines */}
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

function DamagePin({ damage, index, total, onClick }) {
  const ref = useRef();
  const color = SEVERITY_COLORS[damage.severity] || '#94A3B8';

  // Distribute markers along road X axis based on distance_meter (0–1000 → -9 to 9)
  const xPos = (damage.distance_meter / 1000) * 18 - 9;
  // Scatter slightly along Z (within road width)
  const zPos = (index % 3 - 1) * 0.6;

  // Floating animation
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  return (
    <group position={[xPos, 0, zPos]} onClick={onClick}>
      {/* Pin pole */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Pin head */}
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
        {/* Label */}
        <Billboard follow>
          <Text
            position={[0, 0.35, 0]}
            fontSize={0.18}
            color="#334155"
            anchorX="center"
            anchorY="bottom"
            font={undefined}
          >
            {damage.distance_meter}m
          </Text>
        </Billboard>
      </group>

      {/* Ground marker (damage spot on road) */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
