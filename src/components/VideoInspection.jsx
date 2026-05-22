import React, { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Clock, FileVideo,
  Lightbulb, Loader2, MapPin, Upload, XCircle, Zap, Eye, Image,
} from 'lucide-react';
import { processVideoUpload, checkInferenceServiceHealth } from '../utils/cvEngine';
import { supabase, isSupabaseConnected } from '../supabaseClient';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE_MB = parseInt(import.meta.env.VITE_MAX_VIDEO_FILE_SIZE_MB || '500', 10);

const SEVERITY_BADGE = {
  Ringan: 'bg-green-500/20 text-green-300 border-green-500/40',
  Sedang: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Parah:  'bg-red-500/20  text-red-300  border-red-500/40',
  low:    'bg-green-500/20 text-green-300 border-green-500/40',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  high:   'bg-red-500/20  text-red-300  border-red-500/40',
};

const CATEGORY_BADGE = {
  road_defect: 'bg-red-500/15 text-red-300 border-red-500/30',
  asset:       'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

const SEV_EN_TO_ID = { low: 'Ringan', medium: 'Sedang', high: 'Parah' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function Badge({ children, className = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function VideoInspection({ onBack, tollRoads = [] }) {
  // ---- setup state ----
  const [videoFile,       setVideoFile]       = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [inspectorName,   setInspectorName]   = useState('');
  const [selectedTollRoadId, setSelectedTollRoadId] = useState('');
  const [detectionMode,   setDetectionMode]   = useState('both'); // both | asset_only | defect_only
  const [locationOption,  setLocationOption]  = useState('gps'); // gps | skip
  const [gpsPosition,     setGpsPosition]     = useState(null);
  const [gpsError,        setGpsError]        = useState(null);
  const fileInputRef = useRef(null);

  // ---- processing state ----
  const [phase,      setPhase]      = useState('setup');  // setup | processing | results | error
  const [progress,   setProgress]   = useState(0);
  const [statusText, setStatusText] = useState('');
  const [jobResult,  setJobResult]  = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');

  // ---- upload-to-supabase state ----
  const [isUploadingDb, setIsUploadingDb] = useState(false);
  const [uploadedCount,  setUploadedCount] = useState(0);
  const sessionIdRef = useRef(`video_${Date.now()}`);

  // ---- File selection ----
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      alert(`Video terlalu besar: ${sizeMb.toFixed(1)} MB. Maksimum ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setVideoFile(file);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(file));
  }, [videoPreviewUrl]);

  // ---- GPS ----
  const acquireGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation.');
      return;
    }
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsError('Tidak dapat mengambil lokasi GPS. Coba aktifkan izin lokasi.'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  // ---- Start inspection ----
  const startInspection = useCallback(async () => {
    if (!videoFile) { alert('Pilih file video terlebih dahulu.'); return; }

    const backendUp = await checkInferenceServiceHealth();
    if (!backendUp) {
      setErrorMsg(
        'Inference backend tidak berjalan.\n\n' +
        'Jalankan di terminal:\n  cd backend\n  pip install -r requirements.txt\n  uvicorn main:app --reload'
      );
      setPhase('error');
      return;
    }

    const lat = locationOption === 'gps' && gpsPosition ? gpsPosition.lat : null;
    const lng = locationOption === 'gps' && gpsPosition ? gpsPosition.lng : null;
    const locStatus = lat ? 'approximate' : 'missing';

    setPhase('processing');
    setProgress(0);
    setStatusText('Mengunggah video...');

    try {
      const result = await processVideoUpload(videoFile, {
        sessionId: sessionIdRef.current,
        detectionMode,
        latitude:  lat,
        longitude: lng,
        locationStatus: locStatus,
        onProgress: (pct, status) => {
          setProgress(pct);
          setStatusText(
            `Memproses frame ${status.frames_processed ?? 0} / ${status.frames_total ?? '?'}` +
            ` — ${status.detections_count ?? 0} deteksi ditemukan`
          );
        },
      });

      setJobResult(result);
      setPhase('results');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  }, [videoFile, detectionMode, locationOption, gpsPosition]);

  // ---- Upload results to Supabase ----
  const uploadToSupabase = useCallback(async () => {
    if (!isSupabaseConnected() || !jobResult) return;

    setIsUploadingDb(true);
    let count = 0;

    try {
      // Create inspection session
      const { data: session } = await supabase.from('inspection_sessions').insert({
        source_type:      'video_upload',
        toll_road_id:     selectedTollRoadId || null,
        inspector_name:   inspectorName || 'Petugas Anonim',
        status:           'completed',
        total_frames:     jobResult.framesProcessed,
        total_detections: jobResult.detectionsCount,
        total_events:     jobResult.eventsCount,
        started_at:       new Date(Date.now() - 60_000).toISOString(),
        ended_at:         jobResult.completedAt || new Date().toISOString(),
      }).select().single();

      const sessionDbId = session?.id;

      // Find a segment for the toll road (for legacy damage_reports)
      let segmentId = null;
      if (selectedTollRoadId) {
        const { data: segs } = await supabase
          .from('road_segments').select('id')
          .eq('toll_road_id', selectedTollRoadId).limit(1);
        segmentId = segs?.[0]?.id;
      }

      const quarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

      // Iterate over detection events (deduplicated results)
      for (const ev of jobResult.events) {
        const hasLocation = ev.latitude && ev.longitude;

        // Insert into detection_events
        if (sessionDbId) {
          await supabase.from('detection_events').insert({
            session_id:    sessionDbId,
            class_name:    ev.className,
            category:      ev.category,
            best_confidence: ev.bestConfidence,
            severity:      ev.severity,
            first_seen_video_second: ev.firstSeenSecond,
            last_seen_video_second:  ev.lastSeenSecond,
            representative_annotated_image_url: ev.representativeAnnotatedImageUrl,
            detection_count: ev.detectionCount,
            latitude:      ev.latitude,
            longitude:     ev.longitude,
            location_status: ev.locationStatus || 'missing',
            status:        'detected',
          });
        }

        // Also insert into legacy tables so map renders them
        if (hasLocation) {
          if (ev.category === 'road_defect' && segmentId) {
            const dmgType = _classToLegacyDmgType(ev.className);
            if (dmgType) {
              await supabase.from('damage_reports').insert({
                segment_id:    segmentId,
                damage_type:   dmgType,
                severity:      SEV_EN_TO_ID[ev.severity] || 'Sedang',
                lat:           ev.latitude,
                lng:           ev.longitude,
                distance_meter: 0,
                quarter_period: quarter,
                image_url:     ev.representativeAnnotatedImageUrl,
                ai_confidence: Math.round((ev.bestConfidence || 0) * 100),
                source:        'ai_scanner',
                scanned_at:    new Date().toISOString(),
              });
            }
          }

          if (ev.category === 'asset') {
            const assetType = _classToLegacyAssetType(ev.className);
            await supabase.from('toll_assets').insert({
              toll_road_id:  selectedTollRoadId || null,
              asset_type:    assetType,
              lat:           ev.latitude,
              lng:           ev.longitude,
              condition:     (ev.bestConfidence || 0) >= 0.8 ? 'Baik' : 'Rusak Ringan',
              image_url:     ev.representativeAnnotatedImageUrl,
              ai_confidence: Math.round((ev.bestConfidence || 0) * 100),
              scanned_at:    new Date().toISOString(),
            });
          }
        }

        count++;
        setUploadedCount(count);
      }

      alert(`✅ ${count} detection events berhasil disimpan ke database!`);
    } catch (err) {
      console.error('Supabase upload error:', err);
      alert(`❌ Upload gagal: ${err.message}`);
    } finally {
      setIsUploadingDb(false);
    }
  }, [jobResult, selectedTollRoadId, inspectorName]);

  // ===========================================================================
  // RENDER
  // ===========================================================================

  // ---- ERROR phase ----
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Terjadi Kesalahan</h2>
        <pre className="text-sm text-red-300 bg-red-900/20 rounded-xl p-4 text-left whitespace-pre-wrap max-w-md">
          {errorMsg}
        </pre>
        <button
          onClick={() => setPhase('setup')}
          className="mt-6 px-6 py-2 bg-surface-700 rounded-xl text-white hover:bg-surface-600 transition"
        >
          Kembali ke Setup
        </button>
      </div>
    );
  }

  // ---- PROCESSING phase ----
  if (phase === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
        <div className="relative">
          <Loader2 size={52} className="text-hka-red animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-xs">{progress}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">Memproses Video...</p>
          <p className="text-surface-400 text-sm mt-1 max-w-xs">{statusText}</p>
        </div>
        <div className="w-full max-w-sm bg-surface-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-hka-red to-red-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-surface-500 text-xs">
          Jangan tutup halaman ini selama video sedang diproses.
        </p>
      </div>
    );
  }

  // ---- RESULTS phase ----
  if (phase === 'results' && jobResult) {
    return <ResultsView
      jobResult={jobResult}
      onBack={() => setPhase('setup')}
      onUpload={uploadToSupabase}
      isUploadingDb={isUploadingDb}
      uploadedCount={uploadedCount}
      supabaseConnected={isSupabaseConnected()}
    />;
  }

  // ---- SETUP phase ----
  return (
    <div className="flex flex-col gap-5 p-5 max-w-lg mx-auto w-full">

      {/* File picker */}
      <div>
        <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">
          Video Inspeksi
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors
            ${videoFile ? 'border-hka-red/60 bg-hka-red/5' : 'border-surface-600 bg-surface-700/30 hover:border-surface-500'}`}
        >
          {videoFile ? (
            <>
              <FileVideo size={28} className="text-hka-red" />
              <p className="text-white font-semibold text-sm text-center">{videoFile.name}</p>
              <p className="text-surface-400 text-xs">
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              {videoPreviewUrl && (
                <video src={videoPreviewUrl} className="w-full rounded-lg mt-2 max-h-40 object-cover" muted />
              )}
            </>
          ) : (
            <>
              <Upload size={28} className="text-surface-500" />
              <p className="text-surface-400 text-sm">Klik untuk pilih file video</p>
              <p className="text-surface-600 text-xs">MP4, MOV, AVI — maks {MAX_FILE_SIZE_MB} MB</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Inspector name */}
      <div>
        <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Nama Petugas</label>
        <input
          type="text"
          value={inspectorName}
          onChange={e => setInspectorName(e.target.value)}
          placeholder="Opsional"
          className="w-full bg-surface-700/60 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder:text-surface-500 outline-none focus:border-hka-red"
        />
      </div>

      {/* Toll road selector */}
      {tollRoads.length > 0 && (
        <div>
          <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Ruas Tol</label>
          <select
            value={selectedTollRoadId}
            onChange={e => setSelectedTollRoadId(e.target.value)}
            className="w-full bg-surface-700/60 border border-surface-600 rounded-xl px-4 py-3 text-white outline-none focus:border-hka-red appearance-none"
          >
            <option value="">— Pilih ruas tol —</option>
            {tollRoads.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      {/* Detection mode */}
      <div>
        <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Tipe Deteksi</label>
        <div className="flex bg-surface-700/60 p-1 rounded-xl">
          {[
            { label: 'Keduanya',     value: 'both' },
            { label: 'Hanya Aset',   value: 'asset_only' },
            { label: 'Hanya Rusak',  value: 'defect_only' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDetectionMode(opt.value)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors
                ${detectionMode === opt.value ? 'bg-hka-red text-white shadow' : 'text-surface-300 hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Lokasi Inspeksi</label>
        <div className="flex gap-2 mb-2">
          {[
            { label: 'Ambil GPS Saat Ini', value: 'gps' },
            { label: 'Lewati', value: 'skip' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setLocationOption(opt.value)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors
                ${locationOption === opt.value
                  ? 'bg-hka-red/20 border-hka-red text-hka-red'
                  : 'bg-surface-700/60 border-surface-600 text-surface-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {locationOption === 'gps' && (
          <div className="bg-surface-700/40 rounded-xl p-3">
            {gpsPosition ? (
              <p className="text-green-400 text-xs flex items-center gap-2">
                <CheckCircle size={14} />
                {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
              </p>
            ) : (
              <button
                onClick={acquireGps}
                className="flex items-center gap-2 text-xs text-surface-300 hover:text-white transition"
              >
                <MapPin size={14} className="text-hka-red" />
                {gpsError || 'Klik untuk ambil lokasi GPS'}
              </button>
            )}
            <p className="text-surface-500 text-[10px] mt-1">
              Lokasi ini akan dipakai sebagai approximate location untuk seluruh video.
            </p>
          </div>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={startInspection}
        disabled={!videoFile}
        className="w-full py-4 bg-gradient-to-r from-hka-red to-red-600 text-white text-base font-bold rounded-2xl shadow-xl
          hover:shadow-red-900/60 transition-all active:scale-[0.98] flex items-center justify-center gap-3
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap size={20} /> Mulai Inspeksi Video
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results sub-view — dashboard-style layout
// ---------------------------------------------------------------------------
function ResultsView({ jobResult, onBack, onUpload, isUploadingDb, uploadedCount, supabaseConnected }) {
  const [activeTab, setActiveTab] = useState('events');
  const [expandedId, setExpandedId] = useState(null);

  const totalDefects = jobResult.events.filter(e => e.category === 'road_defect').length;
  const totalAssets  = jobResult.events.filter(e => e.category === 'asset').length;

  const sevBreakdown = { Ringan: 0, Sedang: 0, Parah: 0 };
  jobResult.events.forEach(ev => {
    const s = SEV_EN_TO_ID[ev.severity] || ev.severity;
    if (s in sevBreakdown) sevBreakdown[s]++;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">Hasil Inspeksi Video</h2>
          <p className="text-xs text-surface-400">
            {jobResult.framesProcessed} frame · {jobResult.eventsCount} event deteksi
          </p>
        </div>
      </div>

      {/* Simulation mode warning */}
      {jobResult.simulationMode && (
        <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 shrink-0 flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-xs">
            <span className="font-bold">Mode Simulasi</span> — Model AI tidak terdeteksi. Hasil ini adalah data dummy, bukan inferensi nyata.
          </p>
        </div>
      )}

      {/* Stats panel */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-surface-700/40 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{jobResult.framesProcessed}</p>
            <p className="text-[10px] text-surface-400 mt-0.5">Frame</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <AlertTriangle size={11} className="text-amber-400" />
              <p className="text-xl font-bold text-white">{totalDefects}</p>
            </div>
            <p className="text-[10px] text-surface-400">Kerusakan</p>
          </div>
          <div className="bg-surface-700/40 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{totalAssets}</p>
            <p className="text-[10px] text-surface-400 mt-0.5">Aset</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-700/40 border border-white/10 rounded-xl p-3 flex items-center gap-2">
            <Eye size={14} className="text-surface-400 shrink-0" />
            <div>
              <p className="text-base font-bold text-white leading-none">{jobResult.detectionsCount}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Total Deteksi</p>
            </div>
          </div>
          <div className="bg-surface-700/40 border border-white/10 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400 shrink-0" />
            <div>
              <p className="text-base font-bold text-white leading-none">{jobResult.eventsCount}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Event Unik</p>
            </div>
          </div>
        </div>
        {totalDefects > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.entries(sevBreakdown).map(([sev, count]) => count > 0 && (
              <div key={sev} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${SEVERITY_BADGE[sev]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sev === 'Ringan' ? 'bg-green-400' : sev === 'Sedang' ? 'bg-amber-400' : 'bg-red-400'}`} />
                {sev}: {count}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-white/10">
        {[
          { key: 'events', label: 'Detection Events' },
          { key: 'frames', label: 'Frame Hasil' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold transition-all border-b-2 ${
              activeTab === t.key
                ? 'border-hka-red text-white'
                : 'border-transparent text-surface-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 divide-y divide-white/5">
        {activeTab === 'events' && (
          <>
            {jobResult.events.length === 0 && (
              <EmptyState icon={<Eye size={28} />} label="Tidak ada deteksi" />
            )}
            {jobResult.events.map((ev, idx) => {
              const id = ev.eventId || idx;
              return (
                <EventItem
                  key={id}
                  ev={ev}
                  isExpanded={expandedId === id}
                  onToggle={() => setExpandedId(expandedId === id ? null : id)}
                />
              );
            })}
          </>
        )}

        {activeTab === 'frames' && (
          <>
            {jobResult.results.length === 0 && (
              <EmptyState icon={<Image size={28} />} label="Tidak ada frame dengan deteksi" />
            )}
            {jobResult.results.map((r, i) => (
              <FrameItem key={i} r={r} />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-surface-700/80 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-surface-600 transition-colors"
          >
            Inspeksi Baru
          </button>
          {supabaseConnected && (
            <button
              onClick={onUpload}
              disabled={isUploadingDb}
              className="flex-1 py-3 bg-gradient-to-r from-hka-red to-red-600 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-900/40"
            >
              {isUploadingDb ? (
                <><Loader2 size={16} className="animate-spin" /> {uploadedCount} / {jobResult.eventsCount}</>
              ) : (
                <><Upload size={16} /> Simpan ke Database</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Detection event row with click-to-expand annotated image
function EventItem({ ev, isExpanded, onToggle }) {
  const severityId = SEV_EN_TO_ID[ev.severity] || ev.severity;
  const confPct = Math.round((ev.bestConfidence || 0) * 100);
  const isDefect = ev.category === 'road_defect';
  const confBarColor = isDefect
    ? (severityId === 'Parah' ? 'bg-red-500' : severityId === 'Sedang' ? 'bg-amber-500' : 'bg-green-500')
    : 'bg-blue-500';

  return (
    <div
      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-14 h-10 rounded-lg overflow-hidden bg-surface-700 shrink-0 border border-white/10">
          {ev.representativeAnnotatedImageUrl ? (
            <img src={ev.representativeAnnotatedImageUrl} alt={ev.className} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">
              {isDefect ? <AlertTriangle size={14} /> : <Lightbulb size={14} />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-white text-sm font-semibold truncate">{ev.className}</span>
            <Badge className={CATEGORY_BADGE[ev.category]}>
              {isDefect ? 'Kerusakan' : 'Aset'}
            </Badge>
          </div>
          <p className="text-surface-400 text-xs">
            Confidence: {confPct}% · Muncul {ev.detectionCount}× · {formatSeconds(ev.firstSeenSecond || 0)}–{formatSeconds(ev.lastSeenSecond || 0)}
          </p>
          <div className="mt-1.5 h-1 bg-surface-600/60 rounded-full overflow-hidden w-28">
            <div className={`h-full rounded-full ${confBarColor}`} style={{ width: `${confPct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {ev.severity && (
            <Badge className={SEVERITY_BADGE[ev.severity]}>{severityId}</Badge>
          )}
          <ChevronRight size={14} className={`text-surface-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          {ev.representativeAnnotatedImageUrl && (
            <img
              src={ev.representativeAnnotatedImageUrl}
              alt="annotated detail"
              className="w-full rounded-xl border border-white/10 bg-black/40 object-contain"
              style={{ maxHeight: '280px' }}
            />
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {ev.severity && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${SEVERITY_BADGE[ev.severity]}`}>
                Tingkat: {severityId}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-surface-600 text-surface-300 bg-surface-700/40">
              {confPct}% confidence
            </span>
            {ev.detectionCount > 1 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-surface-600 text-surface-300 bg-surface-700/40">
                {ev.detectionCount}× deteksi
              </span>
            )}
          </div>
          {ev.latitude && (
            <p className="text-surface-500 text-[10px] font-mono mt-2">
              📍 {ev.latitude.toFixed(5)}, {ev.longitude?.toFixed(5)}
              <span className="ml-1.5 text-surface-600">({ev.locationStatus})</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Frame result row with click-to-expand
function FrameItem({ r }) {
  const [expanded, setExpanded] = useState(false);
  const imgSrc = r.annotatedImageBase64
    ? `data:image/jpeg;base64,${r.annotatedImageBase64}`
    : r.annotatedImageUrl;

  return (
    <div
      className={`cursor-pointer transition-colors ${expanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-16 h-11 rounded-lg overflow-hidden bg-surface-700 shrink-0 border border-white/10">
          {imgSrc ? (
            <img src={imgSrc} alt={`frame ${r.frameIndex}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">
              <Image size={14} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold mb-1">
            Frame #{r.frameIndex}
            <span className="text-surface-400 font-normal text-xs ml-2">{formatSeconds(r.videoTimestampSecond || 0)}</span>
          </p>
          <div className="flex flex-wrap gap-1">
            {r.damages?.map((d, di) => (
              <span key={di} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SEVERITY_BADGE[d.severity] || SEVERITY_BADGE.Sedang}`}>
                {d.type}
              </span>
            ))}
            {r.assets?.map((a, ai) => (
              <span key={ai} className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-500/30 bg-blue-500/10 text-blue-300">
                {a.type}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight size={14} className={`text-surface-500 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && imgSrc && (
        <div className="px-4 pb-4">
          <img
            src={imgSrc}
            alt="frame detail"
            className="w-full rounded-xl border border-white/10 bg-black/40 object-contain"
            style={{ maxHeight: '280px' }}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center py-10 text-surface-500 gap-2">
      {icon}
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy class → legacy DB column helpers
// ---------------------------------------------------------------------------
function _classToLegacyDmgType(className) {
  const MAP = {
    pothole:             'Lubang',
    longitudinal_crack:  'Retak Memanjang',
    transverse_crack:    'Retak Melintang',
    alligator_crack:     'Retak Buaya',
    hairline_crack:      'Retak Memanjang',
    patching:            'Lubang',
    rutting:             'Retak Memanjang',
    surface_depression:  'Lubang',
  };
  return MAP[className] || null;
}

function _classToLegacyAssetType(className) {
  const MAP = {
    street_light:        'Lampu Jalan',
    lamp_post:           'Lampu Jalan',
    light_pole:          'Lampu Jalan',
    street_lamp:         'Lampu Jalan',
    concrete_barrier:    'Pembatas Jalan',
    jersey_barrier:      'Pembatas Jalan',
    guardrail:           'Guardrail',
    traffic_sign:        'Plang/Rambu',
    direction_sign:      'Rambu Arah',
    highway_sign:        'Rambu Arah',
    overhead_sign:       'Rambu Arah',
    billboard:           'Billboard',
    advertisement_board: 'Billboard',
    videotron:           'Videotron',
    led_display:         'Videotron',
    digital_sign:        'Videotron',
    cctv_pole:           'CCTV',
    surveillance_camera: 'CCTV',
    gantry:              'Gantry Tol',
    overhead_gantry:     'Gantry Tol',
    sign_bridge:         'Gantry Tol',
    delineator:          'Delineator',
    road_stud:           'Delineator',
    road_marking:        'Marka Jalan',
  };
  return MAP[className] || 'Lainnya';
}
