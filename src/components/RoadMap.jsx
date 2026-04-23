import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { TOLL_POLYLINES } from '../data/mockData';
import { computeBezierPath } from '../utils/bezierHelper';

// ---- MapTiler Configuration ----
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || 'z3FQlQ6qtcS41j56FEOl';
const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

const SEVERITY_MARKER_COLORS = {
  Ringan: { bg: '#22C55E', border: '#16A34A', text: '#15803D' },
  Sedang: { bg: '#F59E0B', border: '#D97706', text: '#B45309' },
  Parah: { bg: '#EF4444', border: '#DC2626', text: '#B91C1C' },
};
const ASSET_MARKER_ICONS = {
  'Lampu Jalan': '💡',
  'Pembatas Jalan': '🚧',
  'Plang/Rambu': '🪧',
  'Guardrail': '🛡️',
  'CCTV': '📹',
  'Gantry Tol': '🏗️',
  'Lainnya': '📦',
};

const ASSET_MARKER_COLORS = {
  'Lampu Jalan': '#FBBF24',
  'Pembatas Jalan': '#FB923C',
  'Plang/Rambu': '#60A5FA',
  'Guardrail': '#A78BFA',
  'CCTV': '#34D399',
  'Gantry Tol': '#F472B6',
  'Lainnya': '#94A3B8',
};


// Toll road line styling — thick red/orange/green overlay
const TOLL_LINE_PAINT = {
  'line-color': ['case',
    ['>=', ['get', 'condition'], 90], '#22C55E',
    ['>=', ['get', 'condition'], 75], '#F59E0B',
    '#EF4444'
  ],
  'line-width': [
    'interpolate', ['linear'], ['zoom'],
    5, 2,
    10, 5,
    15, 10,
    18, 16
  ],
  'line-opacity': 0.8,
};

// Toll road outer glow
const TOLL_LINE_GLOW_PAINT = {
  'line-color': ['case',
    ['>=', ['get', 'condition'], 90], '#22C55E',
    ['>=', ['get', 'condition'], 75], '#F59E0B',
    '#EF4444'
  ],
  'line-width': [
    'interpolate', ['linear'], ['zoom'],
    5, 4,
    10, 9,
    15, 16,
    18, 24
  ],
  'line-opacity': 0.25,
  'line-blur': 4,
};

/**
 * Helper: Check if a point [lng, lat] is within the current map viewport bounds.
 * Adds padding so markers near edges are still rendered.
 */
function isInBounds(bounds, lng, lat, padding = 0.05) {
  if (!bounds) return true; // No bounds yet = render all
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return (
    lng >= sw.lng - padding &&
    lng <= ne.lng + padding &&
    lat >= sw.lat - padding &&
    lat <= ne.lat + padding
  );
}

export default function RoadMap({
  tollRoads, damages, assets = [], onMarkerClick, onTollRoadClick, viewState,
  isEditingRoute, editCoordinates, setEditCoordinates,
  kmzData, kmzBounds
}) {
  const mapRef = useRef(null);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showAssets, setShowAssets] = useState(true);
  const [showDamages, setShowDamages] = useState(true);
  const [showKmz, setShowKmz] = useState(true);

  // ---- Viewport bounds tracking for per-city rendering ----
  const [mapBounds, setMapBounds] = useState(null);
  const [mapZoom, setMapZoom] = useState(6);

  // ---- Legend section collapse state ----
  const [legendSections, setLegendSections] = useState({
    condition: false,  // collapsed by default
    damage: true,      // open by default  
    kmz: false,
    assets: false,     // collapsed by default
  });

  const toggleLegendSection = useCallback((section) => {
    setLegendSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Update bounds when map moves
  const handleMapMove = useCallback(() => {
    const map = mapRef.current?.getMap?.() || mapRef.current;
    if (map) {
      setMapBounds(map.getBounds());
      setMapZoom(map.getZoom());
    }
  }, []);

  // Auto-zoom to KMZ data when imported
  useEffect(() => {
    if (kmzBounds && mapRef.current) {
      const map = mapRef.current.getMap?.() || mapRef.current;
      console.log('[RoadMap] Flying to KMZ bounds:', kmzBounds);
      try {
        map.fitBounds(kmzBounds, { padding: 80, duration: 1500, maxZoom: 16 });
      } catch (err) {
        console.error('[RoadMap] fitBounds error:', err);
      }
    }
  }, [kmzBounds]);

  // Compute map center based on damages or default Jakarta
  const center = damages.length > 0
    ? {
      lng: damages.reduce((s, d) => s + Number(d.lng), 0) / damages.length,
      lat: damages.reduce((s, d) => s + Number(d.lat), 0) / damages.length,
    }
    : { lng: 106.845, lat: -6.285 };

  const zoom = viewState === 'detail' ? 15 : 6;
  const pitch = viewState === 'detail' ? 55 : 0;
  const bearing = viewState === 'detail' ? -20 : 0;

  // ---- VIEWPORT-FILTERED DATA (per-city rendering) ----
  // Only render markers that are visible in the current viewport
  const visibleDamages = useMemo(() => {
    if (!mapBounds || viewState === 'detail') return damages; // In detail view, show all for the selected road
    return damages.filter(d => isInBounds(mapBounds, Number(d.lng), Number(d.lat)));
  }, [damages, mapBounds, viewState]);

  const visibleAssets = useMemo(() => {
    if (!mapBounds || viewState === 'detail') return assets;
    return assets.filter(a => isInBounds(mapBounds, Number(a.lng), Number(a.lat)));
  }, [assets, mapBounds, viewState]);

  const visibleTollLabels = useMemo(() => {
    if (!mapBounds || viewState !== 'dashboard') return tollRoads;
    return tollRoads.filter(r => {
      const coords = TOLL_POLYLINES[r.id];
      if (!coords || !coords.length) return false;
      // Check if any point of the polyline is visible
      return coords.some(([lng, lat]) => isInBounds(mapBounds, lng, lat, 0.2));
    });
  }, [tollRoads, mapBounds, viewState]);

  // Build GeoJSON for polylines
  const polylineGeoJSON = {
    type: 'FeatureCollection',
    features: tollRoads
      .filter(r => isEditingRoute || r.path_geometry || TOLL_POLYLINES[r.id])
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
  };

  const onMapLoad = useCallback((e) => {
    const map = e.target;

    // Enable drag rotation for 3D
    if (map.dragRotate) map.dragRotate.enable();
    if (map.touchZoomRotate) map.touchZoomRotate.enableRotation();

    // Get initial bounds
    setMapBounds(map.getBounds());
    setMapZoom(map.getZoom());

    // ---- ADD 3D BUILDINGS LAYER ----
    // MapTiler streets-v2 uses 'openmaptiles' as the vector source.
    // We add a fill-extrusion layer to render buildings with height.
    const layers = map.getStyle().layers;

    // Find the first label/symbol layer to insert buildings below it
    let labelLayerId;
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        labelLayerId = layer.id;
        break;
      }
    }

    // Only add if not already present
    if (!map.getLayer('3d-buildings')) {
      // Find the correct vector source id ('v3', 'openmaptiles', or 'maptiler_planet')
      const sources = Object.keys(map.getStyle().sources);
      const vectorSource = sources.find(s => s === 'v3' || s === 'openmaptiles' || s === 'maptiler_planet');

      if (vectorSource) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: vectorSource,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['get', 'render_height'],
                0, '#e8e4de',
                15, '#dbd6ce',
                30, '#d4cfc7',
                60, '#c0b9af',
                120, '#aba49a',
              ],
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14, ['get', 'render_height'],
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14, ['get', 'render_min_height'],
              ],
              'fill-extrusion-opacity': 0.85,
            },
          },
          labelLayerId  // Insert below labels so text remains readable
        );
      }
    }
  }, []);

  const handleMapClick = useCallback((e) => {
    if (isEditingRoute && setEditCoordinates) {
      setEditCoordinates(prev => [...prev, {
        id: `node-${Date.now()}`,
        pt: [e.lngLat.lng, e.lngLat.lat],
        cpIn: null, cpOut: null
      }]);
    }
  }, [isEditingRoute, setEditCoordinates]);

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom,
          pitch,
          bearing,
        }}
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

        {/* ====== KMZ IMPORTED DATA ====== */}
        {kmzData && showKmz && (
          <>
            {/* Separate sources for lines and polygons to avoid filter issues */}
            <Source
              id="kmz-lines-source"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: (kmzData.features || []).filter(f =>
                  f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
                )
              }}
            >
              {/* Main line */}
              <Layer
                id="kmz-lines"
                type="line"
                paint={{
                  'line-color': ['get', 'stroke'],
                  'line-width': ['get', 'stroke-width'],
                  'line-opacity': ['get', 'stroke-opacity']
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
              {/* Glow behind lines */}
              <Layer
                id="kmz-lines-glow"
                type="line"
                beforeId="kmz-lines"
                paint={{
                  'line-color': ['get', 'stroke'],
                  'line-width': ['*', ['get', 'stroke-width'], 2.5],
                  'line-opacity': 0.2,
                  'line-blur': 4
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </Source>

            <Source
              id="kmz-polygons-source"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: (kmzData.features || []).filter(f =>
                  f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
                )
              }}
            >
              <Layer
                id="kmz-polygons"
                type="fill"
                paint={{
                  'fill-color': ['get', 'fill'],
                  'fill-opacity': ['get', 'fill-opacity']
                }}
              />
              <Layer
                id="kmz-polygon-outlines"
                type="line"
                paint={{
                  'line-color': ['get', 'stroke'],
                  'line-width': ['get', 'stroke-width'],
                  'line-opacity': ['get', 'stroke-opacity']
                }}
              />
            </Source>

            {/* KMZ Point markers — viewport-filtered */}
            {(kmzData.features || []).filter(f =>
              f.geometry && f.geometry.type === 'Point' &&
              isInBounds(mapBounds, f.geometry.coordinates[0], f.geometry.coordinates[1])
            ).map((f, i) => (
              <Marker
                key={`kmz-pt-${i}`}
                longitude={f.geometry.coordinates[0]}
                latitude={f.geometry.coordinates[1]}
                anchor="center"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: f.properties.stroke || '#EB1D24' }}
                  title={f.properties.name || 'KMZ Point'}
                />
              </Marker>
            ))}
          </>
        )}

        {/* ====== TOLL ROAD POLYLINES ====== */}
        <Source id="toll-roads" type="geojson" data={polylineGeoJSON}>
          {/* Glow/shadow behind */}
          <Layer
            id="toll-road-glow"
            type="line"
            paint={TOLL_LINE_GLOW_PAINT}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          {/* Main line */}
          <Layer
            id="toll-road-lines"
            type="line"
            paint={TOLL_LINE_PAINT}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </Source>

        {/* ====== PEN TOOL EDITOR MARKERS ====== */}
        {isEditingRoute && editCoordinates && (
          <>
            {/* Draw lines connecting anchor and control points for the selected node */}
            {selectedNodeId && editCoordinates.find(n => n.id === selectedNodeId) && (
              <Source
                id="control-lines"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: (() => {
                    const node = editCoordinates.find(n => n.id === selectedNodeId);
                    const features = [];
                    if (node.cpIn) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [node.cpIn, node.pt] } });
                    if (node.cpOut) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [node.pt, node.cpOut] } });
                    return features;
                  })()
                }}
              >
                <Layer type="line" paint={{ 'line-color': '#EF4444', 'line-width': 2, 'line-dasharray': [2, 2] }} />
              </Source>
            )}

            {editCoordinates.map((node, idx) => {
              const isSelected = selectedNodeId === node.id;

              return (
                <React.Fragment key={node.id}>
                  {/* ANCHOR POINT */}
                  <Marker
                    longitude={node.pt[0]}
                    latitude={node.pt[1]}
                    draggable
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                    onDrag={(e) => {
                      setEditCoordinates(prev => {
                        const nw = [...prev];
                        const dx = e.lngLat.lng - nw[idx].pt[0];
                        const dy = e.lngLat.lat - nw[idx].pt[1];
                        nw[idx].pt = [e.lngLat.lng, e.lngLat.lat];
                        if (nw[idx].cpIn) nw[idx].cpIn = [nw[idx].cpIn[0] + dx, nw[idx].cpIn[1] + dy];
                        if (nw[idx].cpOut) nw[idx].cpOut = [nw[idx].cpOut[0] + dx, nw[idx].cpOut[1] + dy];
                        return nw;
                      });
                    }}
                  >
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setEditCoordinates(prev => prev.filter(n => n.id !== node.id));
                      }}
                      className={`w-3.5 h-3.5 rounded-full border-[2px] border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform ${isSelected ? 'bg-hka-red' : 'bg-blue-500'}`}
                    />
                  </Marker>

                  {/* CONTROL POINTS (Only for selected node) */}
                  {isSelected && (
                    <>
                      {/* Control Point In */}
                      <Marker
                        longitude={node.cpIn ? node.cpIn[0] : node.pt[0] - 0.002}
                        latitude={node.cpIn ? node.cpIn[1] : node.pt[1]}
                        draggable
                        onDragStart={() => {
                          if (!node.cpIn) {
                            setEditCoordinates(prev => {
                              const nw = [...prev];
                              nw[idx].cpIn = [nw[idx].pt[0] - 0.002, nw[idx].pt[1]];
                              return nw;
                            });
                          }
                        }}
                        onDrag={(e) => {
                          setEditCoordinates(prev => {
                            const nw = [...prev];
                            nw[idx].cpIn = [e.lngLat.lng, e.lngLat.lat];
                            return nw;
                          });
                        }}
                      >
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full border border-white cursor-pointer shadow hover:scale-150 transition-transform" />
                      </Marker>

                      {/* Control Point Out */}
                      <Marker
                        longitude={node.cpOut ? node.cpOut[0] : node.pt[0] + 0.002}
                        latitude={node.cpOut ? node.cpOut[1] : node.pt[1]}
                        draggable
                        onDragStart={() => {
                          if (!node.cpOut) {
                            setEditCoordinates(prev => {
                              const nw = [...prev];
                              nw[idx].cpOut = [nw[idx].pt[0] + 0.002, nw[idx].pt[1]];
                              return nw;
                            });
                          }
                        }}
                        onDrag={(e) => {
                          setEditCoordinates(prev => {
                            const nw = [...prev];
                            nw[idx].cpOut = [e.lngLat.lng, e.lngLat.lat];
                            return nw;
                          });
                        }}
                      >
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full border border-white cursor-pointer shadow hover:scale-150 transition-transform" />
                      </Marker>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* ====== DAMAGE MARKERS — viewport-filtered (per kota) ====== */}
        {showDamages && visibleDamages.map(d => (
          <Marker
            key={d.id}
            longitude={Number(d.lng)}
            latitude={Number(d.lat)}
            anchor="bottom"
            onClick={e => { e.originalEvent.stopPropagation(); onMarkerClick(d); }}
          >
            <DamageMarkerIcon severity={d.severity} source={d.source} />
          </Marker>
        ))}

        {/* ====== ASSET MARKERS — viewport-filtered (per kota) ====== */}
        {showAssets && visibleAssets.map(a => (
          <Marker
            key={`asset-${a.id}`}
            longitude={Number(a.lng)}
            latitude={Number(a.lat)}
            anchor="center"
          >
            <AssetMarkerIcon type={a.asset_type} condition={a.condition} />
          </Marker>
        ))}

        {/* ====== TOLL ROAD NAME LABELS — viewport-filtered (per kota) ====== */}
        {viewState === 'dashboard' && visibleTollLabels.map(r => {
          const coords = TOLL_POLYLINES[r.id];
          if (!coords || !coords.length) return null;
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

      {/* ====== COMPACT LEGEND OVERLAY (collapsible sections) ====== */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs z-10 border border-surface-200 max-w-[220px]">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-surface-600 flex items-center gap-1"><Layers size={12} /> Legend</p>
            <button onClick={() => setShowLegend(false)} className="text-surface-300 hover:text-surface-500 cursor-pointer text-sm">✕</button>
          </div>

          {/* Viewport info */}
          <div className="text-[9px] text-surface-400 mb-2 bg-surface-50 rounded-md px-2 py-1">
            🗺️ Menampilkan: {visibleDamages.length}/{damages.length} kerusakan, {visibleAssets.length}/{assets.length} aset
          </div>

          {/* --- Kondisi Jalan (collapsible) --- */}
          <LegendSection
            title="🛣️ Kondisi Jalan"
            isOpen={legendSections.condition}
            onToggle={() => toggleLegendSection('condition')}
          >
            <LegendItem color="#22C55E" label="Baik (≥90%)" />
            <LegendItem color="#F59E0B" label="Perhatian (75-90%)" />
            <LegendItem color="#EF4444" label="Kritis (<75%)" />
          </LegendSection>

          {/* --- Kerusakan (collapsible + toggle) --- */}
          <LegendSection
            title="⚠️ Kerusakan"
            isOpen={legendSections.damage}
            onToggle={() => toggleLegendSection('damage')}
            toggleSwitch={{ checked: showDamages, onChange: setShowDamages }}
          >
            <LegendMarker color="#22C55E" label="Ringan" />
            <LegendMarker color="#F59E0B" label="Sedang" />
            <LegendMarker color="#EF4444" label="Parah" />
          </LegendSection>

          {/* --- KMZ Custom (collapsible + toggle) --- */}
          {kmzData && (
            <LegendSection
              title="🗺️ KMZ Custom"
              isOpen={legendSections.kmz}
              onToggle={() => toggleLegendSection('kmz')}
              toggleSwitch={{ checked: showKmz, onChange: setShowKmz }}
            />
          )}

          {/* --- Aset Tol (collapsible + toggle) --- */}
          <LegendSection
            title="🏗️ Aset Tol"
            isOpen={legendSections.assets}
            onToggle={() => toggleLegendSection('assets')}
            toggleSwitch={{ checked: showAssets, onChange: setShowAssets }}
          >
            {Object.entries(ASSET_MARKER_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs">{icon}</span>
                <span className="text-surface-500 text-[10px]">{type}</span>
              </div>
            ))}
          </LegendSection>
        </div>
      )}

      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 z-10 cursor-pointer hover:bg-surface-100 transition-colors"
        >
          <Layers size={16} className="text-surface-500" />
        </button>
      )}

      {/* ====== VIEW MODE BADGE ====== */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-1.5 flex items-center gap-2 z-10">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold text-surface-600">
          {viewState === 'dashboard' ? '3D MAP — Overview' : '3D MAP — Detail'}
        </span>
      </div>

      {/* ====== 3D CONTROLS HINT ====== */}
      {viewState === 'detail' && (
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg shadow px-3 py-2 z-10 text-[10px] text-surface-500 space-y-0.5">
          <p><kbd className="bg-surface-200 px-1 rounded text-[9px]">Ctrl</kbd> + Drag → Rotate 3D</p>
          <p><kbd className="bg-surface-200 px-1 rounded text-[9px]">Scroll</kbd> → Zoom In/Out</p>
          <p>Right-click + Drag → Tilt</p>
        </div>
      )}
    </div>
  );
}

/* ---- COLLAPSIBLE LEGEND SECTION ---- */
function LegendSection({ title, isOpen, onToggle, toggleSwitch, children }) {
  return (
    <div className="border-t border-surface-100 pt-1.5 mt-1.5">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-[10px] font-semibold text-surface-500 hover:text-surface-700 cursor-pointer transition-colors"
        >
          {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {title}
        </button>
        {toggleSwitch && (
          <ToggleSwitch checked={toggleSwitch.checked} onChange={toggleSwitch.onChange} />
        )}
      </div>
      {isOpen && children && (
        <div className="space-y-1 mt-1.5 ml-3 animate-in fade-in slide-in-from-top-1">
          {children}
        </div>
      )}
    </div>
  );
}

/* ---- WARNING TRIANGLE MARKER (matches screenshot style) ---- */
function DamageMarkerIcon({ severity, source }) {
  const colors = SEVERITY_MARKER_COLORS[severity] || SEVERITY_MARKER_COLORS.Sedang;

  return (
    <div className="relative cursor-pointer group" style={{ filter: `drop-shadow(0 2px 4px ${colors.bg}60)` }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L1 21h22L12 2z"
          fill={colors.bg}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <text x="12" y="17" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text>
      </svg>
      {/* AI badge */}
      {source === 'ai_scanner' && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[6px] font-bold rounded px-0.5 leading-tight">AI</div>
      )}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle, ${colors.bg}40 0%, transparent 70%)`,
          transform: 'scale(2)',
        }}
      />
    </div>
  );
}

/* ---- ASSET MARKER ICON ---- */
function AssetMarkerIcon({ type, condition }) {
  const icon = ASSET_MARKER_ICONS[type] || '📦';
  const borderColor = condition === 'Baik' ? '#22C55E' : condition === 'Rusak Ringan' ? '#F59E0B' : '#EF4444';

  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-md cursor-pointer hover:scale-110 transition-transform"
      style={{ border: `2px solid ${borderColor}` }}
      title={`${type} (${condition})`}
    >
      <span className="text-sm leading-none">{icon}</span>
    </div>
  );
}

/* ---- TOGGLE SWITCH ---- */
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${checked ? 'bg-green-500' : 'bg-surface-300'
        }`}
    >
      <div
        className={`w-3 h-3 rounded-full bg-white shadow absolute top-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
      />
    </button>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-1.5 rounded" style={{ backgroundColor: color }} />
      <span className="text-surface-500 text-[10px]">{label}</span>
    </div>
  );
}

function LegendMarker({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="10" height="10" viewBox="0 0 24 24">
        <path d="M12 2L1 21h22L12 2z" fill={color} stroke="white" strokeWidth="2" />
      </svg>
      <span className="text-surface-500 text-[10px]">{label}</span>
    </div>
  );
}
