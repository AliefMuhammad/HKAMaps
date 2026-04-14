import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Activity, AlertTriangle, Settings, Search,
  ChevronRight, Map as MapIcon, Box, Home, Database, Loader2, Camera
} from 'lucide-react';

import { useAppData } from './hooks/useAppData';
import RoadMap from './components/RoadMap';
import Road3DView from './components/Road3DView';
import RightPanel from './components/RightPanel';
import DamageModal from './components/DamageModal';

/*
  VIEW STATES:
  - "dashboard"  → Global monitoring (peta + ringkasan)
  - "detail"     → Detail ruas tol (peta zoomed + detail panel)
  - "3d"         → 3D historis view (three.js + scatter chart)
*/

export default function App() {
  // ---- data from Supabase or mock ----
  const { tollRoads, segments, damages, assets, loading, error, usingMock, updateTollRoadGeometry } = useAppData();
  const navigate = useNavigate();

  const [viewState, setViewState] = useState('dashboard');       // dashboard | detail | 3d
  const [selectedRegion, setSelectedRegion] = useState('Jakarta');
  const [selectedTollRoad, setSelectedTollRoad] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('2024-Q1');
  const [modalReport, setModalReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ---- route editor state ----
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editCoordinates, setEditCoordinates] = useState([]);

  // ---- derived data ----
  const regionRoads = useMemo(
    () => tollRoads.filter(r => r.region === selectedRegion),
    [selectedRegion, tollRoads]
  );

  const tollSegments = useMemo(
    () => selectedTollRoad ? segments.filter(s => s.toll_road_id === selectedTollRoad.id) : [],
    [selectedTollRoad, segments]
  );

  const segmentDamages = useMemo(
    () => {
      if (selectedSegment) return damages.filter(d => d.segment_id === selectedSegment.id);
      if (selectedTollRoad) {
        const segIds = new Set(tollSegments.map(s => s.id));
        return damages.filter(d => segIds.has(d.segment_id));
      }
      const roadIds = new Set(regionRoads.map(r => r.id));
      const segIds = new Set(segments.filter(s => roadIds.has(s.toll_road_id)).map(s => s.id));
      return damages.filter(d => segIds.has(d.segment_id));
    },
    [selectedSegment, selectedTollRoad, tollSegments, regionRoads, damages, segments]
  );

  const allRegionDamages = useMemo(() => {
    const roadIds = new Set(regionRoads.map(r => r.id));
    const segIds = new Set(segments.filter(s => roadIds.has(s.toll_road_id)).map(s => s.id));
    return damages.filter(d => segIds.has(d.segment_id));
  }, [regionRoads, segments, damages]);

  // ---- loading state ----
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-hka-red animate-spin" />
          <p className="text-sm text-surface-500 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  // ---- navigation ----
  const goToDashboard = () => {
    setViewState('dashboard');
    setSelectedTollRoad(null);
    setSelectedSegment(null);
    setIsEditingRoute(false);
  };
  const goToDetail = (road) => {
    setViewState('detail');
    setSelectedTollRoad(road);
    setSelectedSegment(null);
    setIsEditingRoute(false);
  };
  const goTo3D = (segment) => {
    setViewState('3d');
    setSelectedSegment(segment);
    setIsEditingRoute(false);
  };

  // ---- breadcrumb ----
  const breadcrumbs = [{ label: 'Dashboard', action: goToDashboard }];
  if (viewState === 'detail' && selectedTollRoad) {
    breadcrumbs.push({ label: selectedTollRoad.name });
  }
  if (viewState === '3d' && selectedTollRoad && selectedSegment) {
    breadcrumbs.push({ label: selectedTollRoad.name, action: () => goToDetail(selectedTollRoad) });
    breadcrumbs.push({ label: `3D — ${selectedSegment.segment_name}` });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-100">
      {/* ===== DATA SOURCE BADGE ===== */}
      <div className={`fixed bottom-3 left-20 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-sm ${usingMock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
        <Database size={10} />
        {usingMock ? 'Mock Data' : 'Supabase Live'}
      </div>

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="w-16 bg-surface-900 flex flex-col items-center py-5 gap-8 shrink-0 z-30">
        <div className="w-9 h-9 rounded-lg bg-hka-red flex items-center justify-center shadow-lg shadow-hka-red/30 cursor-pointer" onClick={goToDashboard}>
          <span className="text-white font-bold text-sm">HK</span>
        </div>

        <nav className="flex flex-col gap-5 mt-4">
          <SidebarBtn icon={<Home size={20} />} active={viewState === 'dashboard'} onClick={goToDashboard} tooltip="Dashboard" />
          <SidebarBtn icon={<MapIcon size={20} />} active={viewState === 'detail'} onClick={() => { }} tooltip="Peta" />
          <SidebarBtn icon={<Box size={20} />} active={viewState === '3d'} onClick={() => { }} tooltip="3D View" />
          <SidebarBtn icon={<Activity size={20} />} onClick={() => { }} tooltip="Monitoring" />
          <SidebarBtn icon={<AlertTriangle size={20} />} onClick={() => { }} tooltip="Alerts" />
          <SidebarBtn icon={<Camera size={20} />} onClick={() => navigate('/scan')} tooltip="AI Scanner" />
        </nav>

        <div className="mt-auto">
          <SidebarBtn icon={<Settings size={20} />} onClick={() => { }} tooltip="Settings" />
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ---- HEADER ---- */}
        <header className="h-14 bg-white border-b border-surface-200 flex items-center px-5 gap-4 shrink-0 z-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-surface-500">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={14} className="text-surface-300" />}
                {b.action ? (
                  <button onClick={b.action} className="hover:text-hka-red transition-colors cursor-pointer font-medium">
                    {b.label}
                  </button>
                ) : (
                  <span className="text-surface-800 font-semibold">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Search */}
          <div className="ml-auto flex items-center gap-2 bg-surface-100 rounded-lg px-3 py-1.5 w-64">
            <Search size={16} className="text-surface-400" />
            <input
              type="text"
              placeholder="Cari ruas, tol, segmen…"
              className="bg-transparent outline-none text-sm text-surface-700 placeholder:text-surface-400 w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* ---- CONTENT ---- */}
        <div className="flex-1 flex min-h-0">
          {/* CENTER — Map or 3D */}
          <div className="flex-1 relative min-w-0">
            {viewState === '3d' ? (
              <Road3DView
                segment={selectedSegment}
                damages={segmentDamages}
                selectedQuarter={selectedQuarter}
                onQuarterChange={setSelectedQuarter}
                onMarkerClick={setModalReport}
              />
            ) : (
              <RoadMap
                tollRoads={viewState === 'dashboard' ? regionRoads : (selectedTollRoad ? [selectedTollRoad] : [])}
                damages={segmentDamages}
                assets={assets}
                onMarkerClick={setModalReport}
                onTollRoadClick={goToDetail}
                viewState={viewState}
                // Editor props
                isEditingRoute={isEditingRoute}
                editCoordinates={editCoordinates}
                setEditCoordinates={setEditCoordinates}
              />
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="w-[380px] shrink-0 border-l border-surface-200 bg-white overflow-hidden flex flex-col z-10">
            <RightPanel
              viewState={viewState}
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
              regionRoads={regionRoads}
              allRegionDamages={allRegionDamages}
              selectedTollRoad={selectedTollRoad}
              tollSegments={tollSegments}
              segmentDamages={segmentDamages}
              selectedSegment={selectedSegment}
              selectedQuarter={selectedQuarter}
              onTollRoadClick={goToDetail}
              onSegment3DClick={goTo3D}
              onMarkerClick={setModalReport}
              goToDashboard={goToDashboard}
              // Editor props
              isEditingRoute={isEditingRoute}
              setIsEditingRoute={setIsEditingRoute}
              editCoordinates={editCoordinates}
              setEditCoordinates={setEditCoordinates}
              updateTollRoadGeometry={updateTollRoadGeometry}
            />
          </div>
        </div>
      </div>

      {/* ===== DAMAGE MODAL ===== */}
      {modalReport && (
        <DamageModal report={modalReport} onClose={() => setModalReport(null)} />
      )}
    </div>
  );
}

/* ---- SMALL SIDEBAR BUTTON ---- */
function SidebarBtn({ icon, active, onClick, tooltip }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer
        ${active
          ? 'bg-hka-red/20 text-hka-red shadow-sm'
          : 'text-surface-400 hover:text-white hover:bg-surface-700'
        }`}
    >
      {icon}
    </button>
  );
}
