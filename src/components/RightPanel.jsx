import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Eye, TrendingUp,
  AlertCircle, MapPin, BarChart3, Crosshair
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, Cell, Legend
} from 'recharts';
import { ROAD_SEGMENTS, DAMAGE_REPORTS, TOLL_POLYLINES } from '../data/mockData';
import { convertLinesToNodes } from '../utils/bezierHelper';

const DAMAGE_COLORS = {
  'Retak Memanjang': '#3B82F6',
  'Retak Melintang': '#8B5CF6',
  'Retak Buaya': '#F59E0B',
  'Lubang': '#EF4444',
};

const SEVERITY_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah: '#EF4444',
};

export default function RightPanel({
  viewState, selectedRegion, onRegionChange,
  regionRoads, allRegionDamages,
  selectedTollRoad, tollSegments, segmentDamages,
  selectedSegment, selectedQuarter,
  onTollRoadClick, onSegment3DClick, onMarkerClick,
  goToDashboard,
  // Editor props
  isEditingRoute, setIsEditingRoute, editCoordinates, setEditCoordinates, updateTollRoadGeometry
}) {
  if (viewState === '3d') {
    return (
      <State3Panel
        selectedSegment={selectedSegment}
        segmentDamages={segmentDamages}
        selectedQuarter={selectedQuarter}
        onMarkerClick={onMarkerClick}
      />
    );
  }

  if (viewState === 'detail' && selectedTollRoad) {
    return (
      <State2Panel
        tollRoad={selectedTollRoad}
        segments={tollSegments}
        damages={segmentDamages}
        onSegment3DClick={onSegment3DClick}
        onMarkerClick={onMarkerClick}
        goToDashboard={goToDashboard}
        isEditingRoute={isEditingRoute}
        setIsEditingRoute={setIsEditingRoute}
        editCoordinates={editCoordinates}
        setEditCoordinates={setEditCoordinates}
        updateTollRoadGeometry={updateTollRoadGeometry}
      />
    );
  }

  return (
    <State1Panel
      selectedRegion={selectedRegion}
      onRegionChange={onRegionChange}
      regionRoads={regionRoads}
      allRegionDamages={allRegionDamages}
      onTollRoadClick={onTollRoadClick}
    />
  );
}

/* ===================== STATE 1 — DASHBOARD ===================== */
function State1Panel({ selectedRegion, onRegionChange, regionRoads, allRegionDamages, onTollRoadClick }) {
  const regions = ['Jakarta', 'Trans Sumatera'];

  const avgCondition = regionRoads.length
    ? (regionRoads.reduce((s, r) => s + r.condition_good_percentage, 0) / regionRoads.length).toFixed(1)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-surface-200">
        {regions.map(r => (
          <button
            key={r}
            onClick={() => onRegionChange(r)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer
              ${selectedRegion === r
                ? 'text-hka-red border-b-2 border-hka-red'
                : 'text-surface-400 hover:text-surface-600'
              }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Kondisi Baik" value={`${avgCondition}%`} color="text-green-500" icon={<TrendingUp size={18} />} />
          <SummaryCard label="Titik Rusak" value={allRegionDamages.length} color="text-red-500" icon={<AlertCircle size={18} />} />
        </div>

        {/* Donut visual */}
        <div className="bg-surface-50 rounded-xl p-4 flex items-center gap-4">
          <DonutMini percentage={Number(avgCondition)} />
          <div>
            <p className="text-xs text-surface-400">Rata-rata Kondisi Baik</p>
            <p className="text-2xl font-bold text-surface-800">{avgCondition}%</p>
            <p className="text-xs text-surface-400 mt-1">{regionRoads.length} ruas tol terpantau</p>
          </div>
        </div>

        {/* Per-road list */}
        <div>
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Perincian Per Ruas Tol</h3>
          <div className="space-y-2">
            {regionRoads.map(road => {
              const roadSegs = ROAD_SEGMENTS.filter(s => s.toll_road_id === road.id);
              const roadDmgs = DAMAGE_REPORTS.filter(d => roadSegs.some(s => s.id === d.segment_id));
              return (
                <button
                  key={road.id}
                  onClick={() => onTollRoadClick(road)}
                  className="w-full text-left bg-surface-50 hover:bg-surface-100 rounded-lg p-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-surface-700 group-hover:text-hka-red transition-colors truncate pr-2">
                      {road.name}
                    </span>
                    <ChevronRight size={16} className="text-surface-300 group-hover:text-hka-red shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-surface-400 mb-2">
                    <span>{road.total_km} km</span>
                    <span>•</span>
                    <span>{roadDmgs.length} titik rusak</span>
                  </div>
                  <ProgressBar value={road.condition_good_percentage} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== STATE 2 — DETAIL ===================== */
function State2Panel({ 
  tollRoad, segments, damages, onSegment3DClick, onMarkerClick, goToDashboard,
  isEditingRoute, setIsEditingRoute, editCoordinates, setEditCoordinates, updateTollRoadGeometry 
}) {
  const [activeTab, setActiveTab] = useState('detail');
  const [expandedSeg, setExpandedSeg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { key: 'detail', label: 'Detail & Km' },
    { key: 'monitoring', label: 'Monitoring Perbaikan' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-surface-200">
        <button onClick={goToDashboard} className="text-xs text-surface-400 hover:text-hka-red cursor-pointer mb-1">← Kembali</button>
        <h2 className="text-base font-bold text-surface-800 leading-tight">{tollRoad.name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors cursor-pointer
              ${activeTab === t.key ? 'text-hka-red border-b-2 border-hka-red' : 'text-surface-400 hover:text-surface-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* EDIT PETA CONTROLS */}
        {isEditingRoute ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
              <span className="animate-pulse">✏️</span> Mode Edit Garis
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed mb-4">
              <strong>Figma-Style Pen:</strong> Klik titik biru untuk memilihnya. Muncul titik merah <em>(Handle/Control Points)</em> yang bisa Anda tarik untuk membuat garis melengkung <em>(Bezier Curve)</em>.<br/><br/>
              Klik peta kosong = Tambah titik.<br/>
              Klik Kanan pada titik = Hapus titik.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  setIsSaving(true);
                  await updateTollRoadGeometry(tollRoad.id, editCoordinates);
                  setIsSaving(false);
                  setIsEditingRoute(false);
                }}
                disabled={isSaving}
                className="flex-1 bg-hka-red hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
              >
                {isSaving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
              </button>
              <button 
                onClick={() => setIsEditingRoute(false)}
                className="px-3 bg-surface-200 hover:bg-surface-300 text-surface-700 text-xs font-bold rounded-lg transition-colors"
                disabled={isSaving}
              >
                Batal
              </button>
            </div>
            {editCoordinates.length > 0 && (
              <button 
                onClick={() => setEditCoordinates(prev => prev.slice(0, -1))}
                className="w-full mt-2 bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-600 text-[10px] font-semibold py-1.5 rounded-md transition-colors"
              >
                ↺ Undo Titik Terakhir
              </button>
            )}
          </div>
        ) : (
          <button 
            onClick={() => {
              const baseCoords = tollRoad.path_geometry || TOLL_POLYLINES[tollRoad.id] || [];
              const nodes = convertLinesToNodes(baseCoords);
              setEditCoordinates(nodes);
              setIsEditingRoute(true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-surface-100 hover:bg-surface-200 border border-surface-200 text-surface-600 text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            ✏️ Sesuaikan Garis Di Peta
          </button>
        )}

        {activeTab === 'detail' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Total Km" value={tollRoad.total_km} />
              <MiniStat label="Titik Rusak" value={damages.length} />
              <MiniStat label="Kondisi Baik" value={`${tollRoad.condition_good_percentage}%`} />
            </div>

            {/* Segments Accordion */}
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Segmen Jalan</h3>
              <div className="space-y-1.5">
                {segments.map(seg => {
                  const segDmgs = damages.filter(d => d.segment_id === seg.id);
                  const isOpen = expandedSeg === seg.id;
                  return (
                    <div key={seg.id} className="bg-surface-50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSeg(isOpen ? null : seg.id)}
                        className="w-full flex items-center justify-between p-3 text-sm cursor-pointer hover:bg-surface-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-hka-red" />
                          <span className="font-medium text-surface-700">{seg.segment_name}</span>
                          <span className="text-xs text-surface-400">({segDmgs.length} kerusakan)</span>
                        </div>
                        {isOpen ? <ChevronDown size={16} className="text-surface-400" /> : <ChevronRight size={16} className="text-surface-400" />}
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 space-y-3 animate-in slide-in-from-top-1">
                          {/* Damage type summary */}
                          <DamageTypeSummary damages={segDmgs} />

                          {/* Quarter bar chart */}
                          <QuarterBarChart damages={segDmgs} />

                          {/* 3D Button */}
                          <button
                            onClick={() => onSegment3DClick(seg)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-hka-red text-white text-xs font-semibold rounded-lg hover:bg-hka-red-dark transition-colors cursor-pointer"
                          >
                            <Eye size={14} /> Lihat Historis 3D
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <MonitoringTab tollRoad={tollRoad} damages={damages} />
        )}
      </div>
    </div>
  );
}

/* ===================== STATE 3 — 3D PANEL ===================== */
function State3Panel({ selectedSegment, segmentDamages, selectedQuarter, onMarkerClick }) {
  const filteredDmgs = segmentDamages.filter(d => d.quarter_period === selectedQuarter);

  // Scatter data by distance
  const scatterData = filteredDmgs.map(d => ({
    x: d.distance_meter,
    y: d.ai_confidence,
    type: d.damage_type,
    severity: d.severity,
    report: d,
  }));

  // Hotspot bins (per 100m)
  const bins = {};
  filteredDmgs.forEach(d => {
    const bin = Math.floor(d.distance_meter / 100) * 100;
    const key = `${bin}-${bin + 100}m`;
    bins[key] = (bins[key] || 0) + 1;
  });
  const hotspots = Object.entries(bins)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => b.count - a.count);

  // Damage type accumulation
  const typeAcc = {};
  filteredDmgs.forEach(d => { typeAcc[d.damage_type] = (typeAcc[d.damage_type] || 0) + 1; });
  const total = filteredDmgs.length || 1;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-200">
        <p className="text-xs text-surface-400 mb-1">TITIK RAWAN KERUSAKAN</p>
        <h2 className="text-base font-bold text-surface-800">{selectedSegment?.segment_name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Scatter */}
        <div className="bg-surface-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-surface-500 mb-2 flex items-center gap-1"><Crosshair size={12} /> Lokasi Kerusakan (meter)</p>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="x" type="number" name="Meter" tick={{ fontSize: 10 }} />
              <YAxis dataKey="y" type="number" name="Confidence" tick={{ fontSize: 10 }} domain={[80, 100]} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white shadow-lg rounded-lg p-2 text-xs border border-surface-200">
                      <p className="font-semibold">{d.type}</p>
                      <p>Meter: {d.x}, Conf: {d.y}%</p>
                      <p className="mt-0.5" style={{ color: SEVERITY_COLORS[d.severity] }}>{d.severity}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} cursor="pointer" onClick={(entry) => onMarkerClick(entry.report)}>
                {scatterData.map((entry, idx) => (
                  <Cell key={idx} fill={DAMAGE_COLORS[entry.type] || '#94A3B8'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Hotspot list */}
        <div>
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Lokasi Paling Rawan</h3>
          <div className="space-y-1.5">
            {hotspots.length === 0 && <p className="text-xs text-surface-400">Tidak ada data untuk triwulan ini.</p>}
            {hotspots.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-surface-700">{h.range}</span>
                <span className="text-xs font-bold text-hka-red">{h.count} kerusakan</span>
              </div>
            ))}
          </div>
        </div>

        {/* Damage type horizontal bars */}
        <div>
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Akumulasi Jenis Kerusakan</h3>
          <div className="space-y-2">
            {Object.entries(typeAcc).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-600">{type}</span>
                  <span className="font-semibold text-surface-700">{count}</span>
                </div>
                <div className="w-full bg-surface-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / total) * 100}%`,
                      backgroundColor: DAMAGE_COLORS[type],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== MONITORING TAB ==================== */
function MonitoringTab({ tollRoad, damages }) {
  const quarterData = {};
  damages.forEach(d => {
    quarterData[d.quarter_period] = (quarterData[d.quarter_period] || 0) + 1;
  });
  const chartData = Object.entries(quarterData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([q, count]) => ({ quarter: q, jumlah: count }));

  return (
    <div className="space-y-4">
      <div className="bg-surface-50 rounded-xl p-3">
        <p className="text-xs font-semibold text-surface-500 mb-2 flex items-center gap-1"><BarChart3 size={12} /> Tren Kerusakan per Triwulan</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="jumlah" fill="#EB1D24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Ringkasan Severity</h3>
        {['Parah', 'Sedang', 'Ringan'].map(sev => {
          const count = damages.filter(d => d.severity === sev).length;
          return (
            <div key={sev} className="flex items-center gap-2 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
              <span className="text-sm text-surface-600 flex-1">{sev}</span>
              <span className="text-sm font-bold text-surface-800">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */
function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="bg-surface-50 rounded-xl p-3 flex flex-col">
      <div className={`${color} mb-1`}>{icon}</div>
      <p className="text-2xl font-bold text-surface-800">{value}</p>
      <p className="text-xs text-surface-400 mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface-50 rounded-lg p-2.5 text-center">
      <p className="text-lg font-bold text-surface-800">{value}</p>
      <p className="text-[10px] text-surface-400 mt-0.5">{label}</p>
    </div>
  );
}

function ProgressBar({ value }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 75 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-surface-200 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

function DonutMini({ percentage }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? '#22C55E' : percentage >= 75 ? '#F59E0B' : '#EF4444';

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="40" y="44" textAnchor="middle" className="text-xs font-bold fill-surface-700">{percentage}%</text>
    </svg>
  );
}

function DamageTypeSummary({ damages }) {
  const counts = {};
  damages.forEach(d => { counts[d.damage_type] = (counts[d.damage_type] || 0) + 1; });

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-surface-500 mb-1">Histori Jenis Kerusakan</p>
      {Object.entries(counts).map(([type, count]) => (
        <div key={type} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DAMAGE_COLORS[type] }} />
          <span className="text-surface-600 flex-1">{type}</span>
          <span className="font-semibold text-surface-700">{count}</span>
        </div>
      ))}
    </div>
  );
}

function QuarterBarChart({ damages }) {
  const qData = {};
  damages.forEach(d => { qData[d.quarter_period] = (qData[d.quarter_period] || 0) + 1; });
  const data = Object.entries(qData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([q, c]) => ({ quarter: q, count: c }));

  if (data.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-surface-500 mb-1">Kerusakan per Triwulan</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="quarter" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Bar dataKey="count" fill="#EB1D24" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
