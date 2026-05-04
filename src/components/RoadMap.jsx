import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { TOLL_POLYLINES } from '../data/mockData';
import { computeBezierPath } from '../utils/bezierHelper';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || 'z3FQlQ6qtcS41j56FEOl';
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

const SEVERITY_MARKER_COLORS = {
  Ringan: { bg: '#22C55E', border: '#16A34A' },
  Sedang: { bg: '#F59E0B', border: '#D97706' },
  Parah:  { bg: '#EF4444', border: '#DC2626' },
};

const DAMAGE_TYPE_ICONS = {
  'Retak Memanjang': '〰️',
  'Retak Melintang': '➖',
  'Retak Buaya':     '🕸️',
  'Lubang':          '⭕',
};

const ASSET_TYPE_CONFIG = {
  'Lampu Jalan':      { icon: '💡', color: '#FBBF24' },
  'Tiang Listrik':    { icon: '⚡', color: '#A78BFA' },
  'Pembatas Jalan':   { icon: '🚧', color: '#FB923C' },
  'Plang/Rambu':      { icon: '🪧', color: '#60A5FA' },
  'Rambu Arah':       { icon: '🛣️', color: '#34D399' },
  'Rambu Peringatan': { icon: '⚠️', color: '#FBBF24' },
  'Guardrail':        { icon: '🛡️', color: '#A78BFA' },
  'CCTV':             { icon: '📹', color: '#34D399' },
  'Gantry Tol':       { icon: '🏗️', color: '#F472B6' },
  'Billboard':        { icon: '📢', color: '#94A3B8' },
  'Videotron':        { icon: '📺', color: '#64748B' },
  'Delineator':       { icon: '🔶', color: '#F97316' },
  'Marka Jalan':      { icon: '〰️', color: '#CBD5E1' },
  'Lainnya':          { icon: '📦', color: '#94A3B8' },
};

const ALL_SEVERITIES = ['Ringan', 'Sedang', 'Parah'];

const TOLL_LINE_PAINT = {
  'line-color': ['case',
    ['>=', ['get', 'condition'], 90], '#22C55E',
    ['>=', ['get', 'condition'], 75], '#F59E0B',
    '#EF4444'
  ],
  'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 5, 15, 10, 18, 16],
  'line-opacity': 0.85,
};
const TOLL_LINE_GLOW_PAINT = {
  'line-color': ['case',
    ['>=', ['get', 'condition'], 90], '#22C55E',
    ['>=', ['get', 'condition'], 75], '#F59E0B',
    '#EF4444'
  ],
  'line-width': ['interpolate', ['linear'], ['zoom'], 5, 6, 10, 12, 15, 22, 18, 30],
  'line-opacity': 0.18,
  'line-blur': 6,
};

function isInBounds(bounds, lng, lat, padding = 0.05) {
  if (!bounds) return true;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return lng >= sw.lng - padding && lng <= ne.lng + padding &&
         lat >= sw.lat - padding && lat <= ne.lat + padding;
}

function getRoadBounds(roadId, pathGeometry) {
  const coords = pathGeometry
    ? pathGeometry.map(n => n.pt || n)
    : (TOLL_POLYLINES[roadId] || []);
  if (!coords.length) return null;
  const lngs = coords.map(c => Array.isArray(c) ? c[0] : c[0]);
  const lats  = coords.map(c => Array.isArray(c) ? c[1] : c[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

export default function RoadMap({
  tollRoads, damages, assets = [], onMarkerClick, onTollRoadClick, viewState,
  isEditingRoute, editCoordinates, setEditCoordinates,
  kmzData, kmzBounds
}) {
  const mapRef = useRef(null);

  // Legend visibility
  const [showLegend, setShowLegend] = useState(true);
  const [legendTab, setLegendTab] = useState('damage'); // 'damage' | 'assets' | 'road'

  // Master visibility toggles
  const [showDamages, setShowDamages] = useState(true);
  const [showAssets, setShowAssets]   = useState(true);
  const [showKmz, setShowKmz]         = useState(true);

  // Per-type filters
  const [activeSeverities, setActiveSeverities] = useState(new Set(ALL_SEVERITIES));
  const [activeAssetTypes, setActiveAssetTypes] = useState(
    new Set(Object.keys(ASSET_TYPE_CONFIG))
  );

  // Editor node selection
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Viewport tracking
  const [mapBounds, setMapBounds] = useState(null);
  const [mapZoom, setMapZoom]     = useState(6);

  // Spiderfying state
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);

  const handleMapMove = useCallback(() => {
    const map = mapRef.current?.getMap?.() || mapRef.current;
    if (map) { setMapBounds(map.getBounds()); setMapZoom(map.getZoom()); }
  }, []);

  // ── AUTO-ZOOM to toll road when entering detail view ──────────────────────
  useEffect(() => {
    if (viewState !== 'detail' || !tollRoads.length) return;
    const road = tollRoads[0];
    const bounds = getRoadBounds(road.id, road.path_geometry);
    if (!bounds) return;
    const tryFit = () => {
      const map = mapRef.current?.getMap?.() || mapRef.current;
      if (!map) return;
      try {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1400 });
      } catch (_) {}
    };
    // Slight delay so map is mounted/ready
    const t = setTimeout(tryFit, 350);
    return () => clearTimeout(t);
  }, [viewState, tollRoads]);

  // ── Auto-zoom to KMZ data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!kmzBounds || !mapRef.current) return;
    const map = mapRef.current.getMap?.() || mapRef.current;
    try { map.fitBounds(kmzBounds, { padding: 80, duration: 1500, maxZoom: 16 }); }
    catch (_) {}
  }, [kmzBounds]);

  // ── GeoJSON for polylines ─────────────────────────────────────────────────
  const polylineGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: tollRoads
      .filter(r => r.path_geometry || TOLL_POLYLINES[r.id])
      .map(r => ({
        type: 'Feature',
        properties: { name: r.name, id: r.id, condition: r.condition_good_percentage },
        geometry: {
          type: 'LineString',
          coordinates: (isEditingRoute && tollRoads.length === 1 && r.id === tollRoads[0].id)
            ? computeBezierPath(editCoordinates, 25)
            : (r.path_geometry ? computeBezierPath(r.path_geometry, 25) : (TOLL_POLYLINES[r.id] || [])),
        },
      })),
  }), [tollRoads, isEditingRoute, editCoordinates]);

  // ── Viewport-filtered data ────────────────────────────────────────────────
  const visibleDamages = useMemo(() => {
    const base = (viewState === 'detail' || !mapBounds)
      ? damages
      : damages.filter(d => isInBounds(mapBounds, Number(d.lng), Number(d.lat)));
    return base.filter(d => showDamages && activeSeverities.has(d.severity));
  }, [damages, mapBounds, viewState, showDamages, activeSeverities]);

  const visibleAssets = useMemo(() => {
    const base = (viewState === 'detail' || !mapBounds)
      ? assets
      : assets.filter(a => isInBounds(mapBounds, Number(a.lng), Number(a.lat)));
    return base.filter(a => showAssets && activeAssetTypes.has(a.asset_type));
  }, [assets, mapBounds, viewState, showAssets, activeAssetTypes]);

  const visibleTollLabels = useMemo(() => {
    if (viewState !== 'dashboard') return tollRoads;
    return tollRoads.filter(r => {
      const coords = TOLL_POLYLINES[r.id];
      if (!coords?.length) return false;
      return !mapBounds || coords.some(([lng, lat]) => isInBounds(mapBounds, lng, lat, 0.2));
    });
  }, [tollRoads, mapBounds, viewState]);

  // Dashboard default center
  const center = damages.length > 0
    ? { lng: damages.reduce((s, d) => s + Number(d.lng), 0) / damages.length,
        lat: damages.reduce((s, d) => s + Number(d.lat), 0) / damages.length }
    : { lng: 106.845, lat: -6.285 };

  const onMapLoad = useCallback((e) => {
    const map = e.target;
    if (map.dragRotate) map.dragRotate.enable();
    if (map.touchZoomRotate) map.touchZoomRotate.enableRotation();
    setMapBounds(map.getBounds());
    setMapZoom(map.getZoom());

    const layers = map.getStyle().layers;
    let labelLayerId;
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) { labelLayerId = layer.id; break; }
    }
    if (!map.getLayer('3d-buildings')) {
      const sources = Object.keys(map.getStyle().sources);
      const vectorSource = sources.find(s => s === 'v3' || s === 'openmaptiles' || s === 'maptiler_planet');
      if (vectorSource) {
        map.addLayer({
          id: '3d-buildings', source: vectorSource, 'source-layer': 'building',
          type: 'fill-extrusion', minzoom: 13,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'render_height'],
              0, '#e8e4de', 15, '#dbd6ce', 30, '#d4cfc7', 60, '#c0b9af', 120, '#aba49a'],
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['get', 'render_height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, ['get', 'render_min_height']],
            'fill-extrusion-opacity': 0.85,
          },
        }, labelLayerId);
      }
    }
  }, []);

  const handleMapClick = useCallback((e) => {
    if (expandedGroupKey) {
      setExpandedGroupKey(null);
    }
    if (isEditingRoute && setEditCoordinates) {
      setEditCoordinates(prev => [...prev, { id: `node-${Date.now()}`, pt: [e.lngLat.lng, e.lngLat.lat], cpIn: null, cpOut: null }]);
    }
  }, [isEditingRoute, setEditCoordinates, expandedGroupKey]);

  // Damage count per severity for legend badges
  const severityCounts = useMemo(() => {
    const c = {};
    ALL_SEVERITIES.forEach(s => { c[s] = damages.filter(d => d.severity === s).length; });
    return c;
  }, [damages]);

  // Asset count per type for legend badges
  const assetTypeCounts = useMemo(() => {
    const c = {};
    assets.forEach(a => { c[a.asset_type] = (c[a.asset_type] || 0) + 1; });
    return c;
  }, [assets]);

  // ── Handling Overlapping Markers (Spiderfying) ────────────────────────────
  const [spiderDamages, spiderAssets, clusterMarkers] = useMemo(() => {
    const grouped = {};
    const RADIUS_PX = 32; // Pixel radius for spiderfying

    const addGroup = (item, type) => {
      const lng = Number(item.lng);
      const lat = Number(item.lat);
      // Group by identical coordinates (up to 5 decimals, approx 1 meter)
      const key = `${lng.toFixed(5)}_${lat.toFixed(5)}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ item, type });
    };

    visibleDamages.forEach(d => addGroup(d, 'damage'));
    visibleAssets.forEach(a => addGroup(a, 'asset'));

    const offsetDamages = [];
    const offsetAssets = [];
    const clusters = [];

    Object.entries(grouped).forEach(([key, group]) => {
      if (group.length === 1) {
        const { item, type } = group[0];
        const processed = { ...item, _offset: [0, 0] };
        if (type === 'damage') offsetDamages.push(processed);
        else offsetAssets.push(processed);
      } else {
        if (expandedGroupKey === key) {
          // Expanded: Calculate dynamic radius based on number of items
          const currentRadius = RADIUS_PX + (group.length > 8 ? (group.length - 8) * 4 : 0);
          
          // Add a central marker to indicate the origin/close button
          clusters.push({
            id: `cluster-center-${key}`,
            lng: group[0].item.lng,
            lat: group[0].item.lat,
            count: group.length,
            groupKey: key,
            isExpandedCenter: true
          });

          group.forEach(({ item, type }, index) => {
            // Calculate angle for a full circle
            const angle = (index / group.length) * Math.PI * 2;
            const x = Math.round(currentRadius * Math.cos(angle));
            const y = Math.round(currentRadius * Math.sin(angle));
            
            const processed = { ...item, _offset: [x, y], _isSpiderfied: true };
            if (type === 'damage') offsetDamages.push(processed);
            else offsetAssets.push(processed);
          });
        } else {
          // Collapsed: Show a single cluster badge
          clusters.push({
            id: `cluster-${key}`,
            lng: group[0].item.lng,
            lat: group[0].item.lat,
            count: group.length,
            groupKey: key,
            isExpandedCenter: false
          });
        }
      }
    });

    return [offsetDamages, offsetAssets, clusters];
  }, [visibleDamages, visibleAssets, expandedGroupKey]);

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 6, pitch: 0, bearing: 0 }}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%', cursor: isEditingRoute ? 'crosshair' : 'grab' }}
        attributionControl={false}
        maxPitch={80}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        onMoveEnd={handleMapMove}
        onZoomEnd={handleMapMove}
      >
        <NavigationControl position="top-right" visualizePitch />

        {/* KMZ Layer */}
        {kmzData && showKmz && (
          <>
            <Source id="kmz-lines-source" type="geojson" data={{ type: 'FeatureCollection', features: (kmzData.features || []).filter(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString') }}>
              <Layer id="kmz-lines-glow" type="line" beforeId="kmz-lines" paint={{ 'line-color': ['get', 'stroke'], 'line-width': ['*', ['get', 'stroke-width'], 2.5], 'line-opacity': 0.2, 'line-blur': 4 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
              <Layer id="kmz-lines" type="line" paint={{ 'line-color': ['get', 'stroke'], 'line-width': ['get', 'stroke-width'], 'line-opacity': ['get', 'stroke-opacity'] }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            </Source>
            <Source id="kmz-polygons-source" type="geojson" data={{ type: 'FeatureCollection', features: (kmzData.features || []).filter(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') }}>
              <Layer id="kmz-polygons" type="fill" paint={{ 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'fill-opacity'] }} />
              <Layer id="kmz-polygon-outlines" type="line" paint={{ 'line-color': ['get', 'stroke'], 'line-width': ['get', 'stroke-width'], 'line-opacity': ['get', 'stroke-opacity'] }} />
            </Source>
            {(kmzData.features || []).filter(f => f.geometry?.type === 'Point' && isInBounds(mapBounds, f.geometry.coordinates[0], f.geometry.coordinates[1])).map((f, i) => (
              <Marker key={`kmz-pt-${i}`} longitude={f.geometry.coordinates[0]} latitude={f.geometry.coordinates[1]} anchor="center">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: f.properties.stroke || '#EB1D24' }} title={f.properties.name || 'KMZ Point'} />
              </Marker>
            ))}
          </>
        )}

        {/* Toll Road Polylines */}
        <Source id="toll-roads" type="geojson" data={polylineGeoJSON}>
          <Layer id="toll-road-glow" type="line" paint={TOLL_LINE_GLOW_PAINT} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
          <Layer id="toll-road-lines" type="line" paint={TOLL_LINE_PAINT} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </Source>

        {/* Route Editor */}
        {isEditingRoute && editCoordinates && (
          <>
            {selectedNodeId && editCoordinates.find(n => n.id === selectedNodeId) && (() => {
              const node = editCoordinates.find(n => n.id === selectedNodeId);
              const features = [];
              if (node.cpIn)  features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [node.cpIn,  node.pt] } });
              if (node.cpOut) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [node.pt, node.cpOut] } });
              return (
                <Source id="control-lines" type="geojson" data={{ type: 'FeatureCollection', features }}>
                  <Layer type="line" paint={{ 'line-color': '#EF4444', 'line-width': 2, 'line-dasharray': [2, 2] }} />
                </Source>
              );
            })()}
            {editCoordinates.map((node, idx) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <React.Fragment key={node.id}>
                  <Marker longitude={node.pt[0]} latitude={node.pt[1]} draggable
                    onClick={e => { e.originalEvent.stopPropagation(); setSelectedNodeId(node.id); }}
                    onDrag={e => {
                      setEditCoordinates(prev => {
                        const nw = [...prev];
                        const dx = e.lngLat.lng - nw[idx].pt[0], dy = e.lngLat.lat - nw[idx].pt[1];
                        nw[idx].pt = [e.lngLat.lng, e.lngLat.lat];
                        if (nw[idx].cpIn)  nw[idx].cpIn  = [nw[idx].cpIn[0]  + dx, nw[idx].cpIn[1]  + dy];
                        if (nw[idx].cpOut) nw[idx].cpOut = [nw[idx].cpOut[0] + dx, nw[idx].cpOut[1] + dy];
                        return nw;
                      });
                    }}>
                    <div onContextMenu={e => { e.preventDefault(); setEditCoordinates(prev => prev.filter(n => n.id !== node.id)); }}
                      className={`w-3.5 h-3.5 rounded-full border-[2px] border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform ${isSelected ? 'bg-hka-red' : 'bg-blue-500'}`} />
                  </Marker>
                  {isSelected && (
                    <>
                      <Marker longitude={node.cpIn ? node.cpIn[0] : node.pt[0] - 0.002} latitude={node.cpIn ? node.cpIn[1] : node.pt[1]} draggable
                        onDragStart={() => { if (!node.cpIn) setEditCoordinates(prev => { const nw = [...prev]; nw[idx].cpIn = [nw[idx].pt[0] - 0.002, nw[idx].pt[1]]; return nw; }); }}
                        onDrag={e => setEditCoordinates(prev => { const nw = [...prev]; nw[idx].cpIn = [e.lngLat.lng, e.lngLat.lat]; return nw; })}>
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full border border-white cursor-pointer shadow hover:scale-150 transition-transform" />
                      </Marker>
                      <Marker longitude={node.cpOut ? node.cpOut[0] : node.pt[0] + 0.002} latitude={node.cpOut ? node.cpOut[1] : node.pt[1]} draggable
                        onDragStart={() => { if (!node.cpOut) setEditCoordinates(prev => { const nw = [...prev]; nw[idx].cpOut = [nw[idx].pt[0] + 0.002, nw[idx].pt[1]]; return nw; }); }}
                        onDrag={e => setEditCoordinates(prev => { const nw = [...prev]; nw[idx].cpOut = [e.lngLat.lng, e.lngLat.lat]; return nw; })}>
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full border border-white cursor-pointer shadow hover:scale-150 transition-transform" />
                      </Marker>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Cluster Badges */}
        {clusterMarkers.map(c => (
          <Marker key={c.id} longitude={Number(c.lng)} latitude={Number(c.lat)} anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setExpandedGroupKey(c.isExpandedCenter ? null : c.groupKey);
            }}>
            <ClusterMarkerIcon count={c.count} isExpanded={c.isExpandedCenter} />
          </Marker>
        ))}

        {/* Damage Markers */}
        {spiderDamages.map(d => (
          <Marker key={d.id} longitude={Number(d.lng)} latitude={Number(d.lat)} anchor="bottom" offset={d._offset}
            onClick={e => { e.originalEvent.stopPropagation(); onMarkerClick(d); }}>
            <DamageMarkerIcon severity={d.severity} source={d.source} isSpiderfied={d._isSpiderfied} />
          </Marker>
        ))}

        {/* Asset Markers */}
        {spiderAssets.map(a => (
          <Marker key={`asset-${a.id}`} longitude={Number(a.lng)} latitude={Number(a.lat)} anchor="center" offset={a._offset}
            onClick={e => { e.originalEvent.stopPropagation(); onMarkerClick(a); }}>
            <AssetMarkerIcon type={a.asset_type} condition={a.condition} isSpiderfied={a._isSpiderfied} />
          </Marker>
        ))}

        {/* Toll Road Name Labels */}
        {viewState === 'dashboard' && visibleTollLabels.map(r => {
          const coords = TOLL_POLYLINES[r.id];
          if (!coords?.length) return null;
          const mid = coords[Math.floor(coords.length / 2)];
          return (
            <Marker key={`label-${r.id}`} longitude={mid[0]} latitude={mid[1]} anchor="bottom" onClick={() => onTollRoadClick(r)}>
              <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md text-[10px] font-semibold text-surface-700 cursor-pointer hover:bg-hka-red hover:text-white transition-all whitespace-nowrap border border-surface-100">
                {r.name.length > 30 ? r.name.slice(0, 30) + '…' : r.name}
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* ══════════════════════ LEGEND PANEL ══════════════════════ */}
      {showLegend ? (
        <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-md rounded-2xl shadow-xl z-10 border border-surface-200 w-[230px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5">
              <Layers size={13} className="text-hka-red" /> Legend & Filter
            </span>
            <button onClick={() => setShowLegend(false)} className="text-surface-300 hover:text-surface-500 cursor-pointer text-sm leading-none">✕</button>
          </div>

          {/* Counter chips */}
          <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
            <CountChip color="#EF4444" label={`${visibleDamages.length} kerusakan`} />
            <CountChip color="#3B82F6" label={`${visibleAssets.length} aset`} />
          </div>

          {/* Tab selector */}
          <div className="flex border-b border-surface-100 px-3">
            {[['damage','⚠️ Kerusakan'],['assets','🏗️ Aset'],['road','🛣️ Jalan']].map(([tab, label]) => (
              <button key={tab} onClick={() => setLegendTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${legendTab === tab ? 'text-hka-red border-b-2 border-hka-red' : 'text-surface-400 hover:text-surface-600'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 max-h-[280px] overflow-y-auto">

            {/* ─── DAMAGE TAB ─── */}
            {legendTab === 'damage' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-surface-400 font-medium">Tampilkan Kerusakan</span>
                  <MasterToggle checked={showDamages} onChange={setShowDamages} />
                </div>
                <p className="text-[9px] text-surface-400 mb-1.5 font-semibold uppercase tracking-wider">Tingkat Keparahan</p>
                {ALL_SEVERITIES.map(sev => (
                  <FilterRow key={sev}
                    icon={<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2z" fill={SEVERITY_MARKER_COLORS[sev].bg} stroke="white" strokeWidth="2"/></svg>}
                    label={sev}
                    count={severityCounts[sev] || 0}
                    active={activeSeverities.has(sev) && showDamages}
                    disabled={!showDamages}
                    onToggle={() => setActiveSeverities(prev => { const n = new Set(prev); n.has(sev) ? n.delete(sev) : n.add(sev); return n; })}
                  />
                ))}
                <p className="text-[9px] text-surface-400 mt-2 mb-1 font-semibold uppercase tracking-wider">Jenis Kerusakan</p>
                {Object.entries(DAMAGE_TYPE_ICONS).map(([type, icon]) => (
                  <div key={type} className="flex items-center gap-2 py-0.5">
                    <span className="text-sm">{icon}</span>
                    <span className="text-[10px] text-surface-500 flex-1">{type}</span>
                    <span className="text-[9px] text-surface-300">{damages.filter(d => d.damage_type === type).length}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ─── ASSETS TAB ─── */}
            {legendTab === 'assets' && (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-surface-400 font-medium">Tampilkan Aset</span>
                  <MasterToggle checked={showAssets} onChange={setShowAssets} />
                </div>
                {Object.entries(ASSET_TYPE_CONFIG).map(([type, cfg]) => (
                  <FilterRow key={type}
                    icon={<span className="text-sm leading-none">{cfg.icon}</span>}
                    label={type}
                    count={assetTypeCounts[type] || 0}
                    active={activeAssetTypes.has(type) && showAssets}
                    disabled={!showAssets}
                    onToggle={() => setActiveAssetTypes(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; })}
                  />
                ))}
              </div>
            )}

            {/* ─── ROAD TAB ─── */}
            {legendTab === 'road' && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-surface-400 font-semibold uppercase tracking-wider mb-2">Kondisi Jalan</p>
                {[['#22C55E','Baik (≥ 90%)'],['#F59E0B','Perhatian (75–90%)'],['#EF4444','Kritis (< 75%)']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-6 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-surface-500">{label}</span>
                  </div>
                ))}
                {kmzData && (
                  <>
                    <div className="border-t border-surface-100 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-surface-500 font-medium">🗺️ Layer KMZ</span>
                      <MasterToggle checked={showKmz} onChange={setShowKmz} />
                    </div>
                  </>
                )}
                <div className="border-t border-surface-100 my-2" />
                <p className="text-[9px] text-surface-400 font-semibold uppercase tracking-wider mb-1.5">Ruas Aktif</p>
                {tollRoads.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-1.5 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.condition_good_percentage >= 90 ? '#22C55E' : r.condition_good_percentage >= 75 ? '#F59E0B' : '#EF4444' }} />
                    <span className="text-[9px] text-surface-500 truncate">{r.name.split(' ').slice(0, 4).join(' ')}</span>
                    <span className="text-[9px] text-surface-300 ml-auto shrink-0">{r.condition_good_percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowLegend(true)}
          className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 z-10 cursor-pointer hover:bg-surface-100 transition-colors border border-surface-200">
          <Layers size={16} className="text-surface-500" />
        </button>
      )}

      {/* View Mode Badge */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-1.5 flex items-center gap-2 z-10">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold text-surface-600">
          {viewState === 'dashboard' ? '3D MAP — Overview' : '3D MAP — Detail'}
        </span>
      </div>

      {/* 3D Controls hint */}
      {viewState === 'detail' && (
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg shadow px-3 py-2 z-10 text-[10px] text-surface-500 space-y-0.5">
          <p><kbd className="bg-surface-200 px-1 rounded text-[9px]">Ctrl</kbd> + Drag → Rotate 3D</p>
          <p><kbd className="bg-surface-200 px-1 rounded text-[9px]">Scroll</kbd> → Zoom</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function CountChip({ color, label }) {
  return (
    <div className="flex items-center gap-1 bg-surface-50 rounded-full px-2 py-0.5 border border-surface-100">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] text-surface-500 font-medium">{label}</span>
    </div>
  );
}

function MasterToggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ${checked ? 'bg-green-500' : 'bg-surface-300'}`}>
      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow absolute top-0.75 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ top: '3px' }} />
    </button>
  );
}

function FilterRow({ icon, label, count, active, disabled, onToggle }) {
  return (
    <button onClick={onToggle} disabled={disabled}
      className={`w-full flex items-center gap-2 py-1 px-1.5 rounded-lg cursor-pointer transition-colors text-left ${active ? 'bg-surface-50' : 'opacity-40'} ${disabled ? 'cursor-not-allowed' : 'hover:bg-surface-100'}`}>
      <span className="w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className={`flex-1 text-[10px] font-medium ${active ? 'text-surface-700' : 'text-surface-400'}`}>{label}</span>
      {count > 0 && (
        <span className="text-[9px] bg-surface-200 text-surface-500 rounded-full px-1.5 py-0.5 font-semibold">{count}</span>
      )}
      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${active && !disabled ? 'bg-hka-red border-hka-red' : 'border-surface-300 bg-white'}`}>
        {active && !disabled && <svg width="8" height="8" viewBox="0 0 8 8"><polyline points="1,4 3,6 7,2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
    </button>
  );
}

function DamageMarkerIcon({ severity, source }) {
  const colors = SEVERITY_MARKER_COLORS[severity] || SEVERITY_MARKER_COLORS.Sedang;
  return (
    <div className="relative cursor-pointer group" style={{ filter: `drop-shadow(0 2px 4px ${colors.bg}60)` }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L1 21h22L12 2z" fill={colors.bg} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <text x="12" y="17" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text>
      </svg>
      {source === 'ai_scanner' && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[6px] font-bold rounded px-0.5 leading-tight">AI</div>
      )}
    </div>
  );
}

function AssetMarkerIcon({ type, condition, isSpiderfied }) {
  const cfg = ASSET_TYPE_CONFIG[type] || { icon: '📦', color: '#94A3B8' };
  const borderColor = condition === 'Baik' ? '#22C55E' : condition === 'Rusak Ringan' ? '#F59E0B' : '#EF4444';
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-md cursor-pointer hover:scale-110 transition-transform ${isSpiderfied ? 'scale-90 hover:scale-105' : ''}`}
      style={{ border: `2px solid ${borderColor}` }} title={`${type} (${condition})`}>
      <span className="text-sm leading-none">{cfg.icon}</span>
    </div>
  );
}

function ClusterMarkerIcon({ count, isExpanded }) {
  if (isExpanded) {
    return (
      <div className="w-6 h-6 rounded-full bg-surface-800 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform opacity-75 hover:opacity-100" title="Tutup">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
    );
  }
  return (
    <div className="group relative cursor-pointer" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>
      {/* Stacked effect base */}
      <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-hka-red/40" />
      <div className="absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-full bg-hka-red/60" />
      {/* Main badge */}
      <div className="relative w-9 h-9 rounded-full bg-hka-red border-2 border-white flex flex-col items-center justify-center text-white transition-transform group-hover:scale-110 group-active:scale-95">
        <span className="text-sm font-bold leading-none">{count}</span>
      </div>
    </div>
  );
}
