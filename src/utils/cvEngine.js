/**
 * CV Engine — computer vision inference integration
 *
 * Priority order for inference:
 *   1. Local Python FastAPI backend (YOLO local model)  ← preferred
 *   2. Roboflow cloud API (fallback if backend unreachable)
 *   3. Simulation mode (fallback of last resort — clearly labelled)
 *
 * All functions that were used by MobileScanner are preserved.
 * New functions: analyzeWithLocalModel(), processVideoUpload(),
 *               pollVideoJobStatus(), analyzeRealtimeFrame()
 */

// ---------------------------------------------------------------------------
// Config (all via Vite env vars so no hardcoded values)
// ---------------------------------------------------------------------------
// Empty string = use Vite proxy (relative URLs, works from mobile devices over HTTPS)
const INFERENCE_API_URL = import.meta.env.VITE_INFERENCE_API_URL ?? '';
const ROBOFLOW_API_KEY  = import.meta.env.VITE_ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ID = import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'road-pothole-detection-fmjio/1';
const ROBOFLOW_WORKSPACE = import.meta.env.VITE_ROBOFLOW_WORKSPACE || 'hka-maps';
const ROBOFLOW_WORKFLOW  = import.meta.env.VITE_ROBOFLOW_WORKFLOW  || 'highway-pipeline';

// ---------------------------------------------------------------------------
// Class taxonomy (kept for Roboflow fallback + UI labelling)
// ---------------------------------------------------------------------------
const DAMAGE_CLASS_MAP = {
  pothole:             'Lubang',
  'longitudinal_crack':'Retak Memanjang',
  'longitudinal-crack':'Retak Memanjang',
  'transverse_crack':  'Retak Melintang',
  'transverse-crack':  'Retak Melintang',
  'alligator_crack':   'Retak Buaya',
  'alligator-crack':   'Retak Buaya',
  hairline_crack:      'Retak Rambut',
  patching:            'Tambalan',
  rutting:             'Alur',
  surface_depression:  'Penurunan Permukaan',
  crack:               'Retak Memanjang',
  D00: 'Retak Memanjang',
  D01: 'Retak Melintang',
  D10: 'Retak Buaya',
  D11: 'Retak Buaya',
  D20: 'Lubang',
  D40: 'Retak Memanjang',
  D43: 'Retak Melintang',
  D44: 'Lubang',
};

const ASSET_CLASS_MAP = {
  // Lampu Jalan (has luminaire/lamp head — curved arm + fixture)
  street_light:       'Lampu Jalan',
  'street-light':     'Lampu Jalan',
  streetlight:        'Lampu Jalan',
  lamp:               'Lampu Jalan',
  lamp_post:          'Lampu Jalan',
  light_pole:         'Lampu Jalan',
  street_lamp:        'Lampu Jalan',
  'street lamp':      'Lampu Jalan',   // YOLO-World

  // Tiang Listrik (bare utility/power pole, no lamp)
  utility_pole:         'Tiang Listrik',
  power_pole:           'Tiang Listrik',
  power_line_pole:      'Tiang Listrik',
  electricity_pole:     'Tiang Listrik',
  electric_pole:        'Tiang Listrik',
  telephone_pole:       'Tiang Listrik',
  'power line pole':    'Tiang Listrik',  // YOLO-World

  // Pembatas
  concrete_barrier:   'Pembatas Jalan',
  barrier:            'Pembatas Jalan',
  jersey_barrier:     'Pembatas Jalan',
  'concrete barrier': 'Pembatas Jalan',   // YOLO-World
  guardrail:          'Guardrail',

  // Plang / Rambu — semua jenis sign diarahkan ke sini
  traffic_sign:       'Plang/Rambu',
  'traffic sign':     'Plang/Rambu',      // YOLO-World
  direction_sign:     'Rambu Arah',
  highway_sign:       'Rambu Arah',
  'highway sign':     'Rambu Arah',       // YOLO-World
  overhead_sign:      'Rambu Arah',
  sign:               'Plang/Rambu',
  warning_sign:         'Rambu Peringatan',
  'warning sign':       'Rambu Peringatan',   // YOLO-World
  chevron_board:        'Rambu Peringatan',
  'chevron board':      'Rambu Peringatan',   // YOLO-World
  road_chevron:         'Rambu Peringatan',
  road_marker_board:    'Rambu Peringatan',

  // Billboard & Videotron
  billboard:          'Billboard',
  advertisement_board:'Billboard',
  videotron:          'Videotron',
  led_display:        'Videotron',
  digital_sign:       'Videotron',
  digital_billboard:  'Videotron',
  'digital billboard':'Videotron',         // YOLO-World

  // Infrastruktur lain
  cctv_pole:          'CCTV',
  cctv:               'CCTV',
  camera:             'CCTV',
  surveillance_camera:'CCTV',
  'cctv camera':      'CCTV',             // YOLO-World
  gantry:             'Gantry Tol',
  toll_gantry:        'Gantry Tol',
  'toll gantry':      'Gantry Tol',       // YOLO-World
  sign_bridge:        'Gantry Tol',
  overhead_gantry:    'Gantry Tol',
  delineator:         'Delineator',
  road_stud:          'Delineator',
  road_marking:       'Marka Jalan',
  'road marking':     'Marka Jalan',      // YOLO-World
};

// Severity colour coding for UI (maps to Indonesian severity labels)
export const SEVERITY_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah:  '#EF4444',
};

// English → Indonesian severity
const SEV_EN_TO_ID = { low: 'Ringan', medium: 'Sedang', high: 'Parah' };
// Indonesian → English severity
const SEV_ID_TO_EN = { Ringan: 'low', Sedang: 'medium', Parah: 'high' };

// ---------------------------------------------------------------------------
// Backend health check (cached per session)
// ---------------------------------------------------------------------------
let _backendAvailable = null;
let _backendCheckTs = 0;

export async function checkInferenceServiceHealth() {
  const now = Date.now();
  if (_backendAvailable !== null && now - _backendCheckTs < 30_000) {
    return _backendAvailable;
  }
  try {
    const res = await fetch(`${INFERENCE_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  _backendCheckTs = now;
  return _backendAvailable;
}

// ---------------------------------------------------------------------------
// Frame capture utility (unchanged from original)
// ---------------------------------------------------------------------------
export function captureFrameAsBase64(videoElement, maxWidth = 640) {
  if (!videoElement.videoWidth || !videoElement.videoHeight) return null;

  const canvas = document.createElement('canvas');
  const ratio = videoElement.videoWidth / videoElement.videoHeight;
  canvas.width  = maxWidth;
  canvas.height = Math.round(maxWidth / ratio);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  if (!dataUrl?.includes(',')) return null;

  return {
    base64: dataUrl.split(',')[1],
    dataUrl,
    blob: _dataURLtoBlob(dataUrl),
    width: canvas.width,
    height: canvas.height,
  };
}

function _dataURLtoBlob(dataUrl) {
  try {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1];
    if (!mime || !data) return null;
    const bstr = atob(data);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Local backend inference (single image)
// ---------------------------------------------------------------------------
export async function analyzeWithLocalModel(
  imageBlob,
  { sessionId, latitude = null, longitude = null, locationStatus = 'missing',
    frameIndex = 0, videoTimestampSecond = 0.0 } = {}
) {
  const fd = new FormData();
  fd.append('image', imageBlob, 'frame.jpg');
  fd.append('session_id', sessionId || '');
  if (latitude  !== null) fd.append('latitude',  latitude);
  if (longitude !== null) fd.append('longitude', longitude);
  fd.append('location_status',        locationStatus);
  fd.append('frame_index',            frameIndex);
  fd.append('video_timestamp_second', videoTimestampSecond);

  const res = await fetch(`${INFERENCE_API_URL}/api/inference/image`, {
    method: 'POST',
    body: fd,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Backend inference error: ${res.status}`);
  const data = await res.json();

  // Normalise to internal format expected by MobileScanner
  return _normaliseBackendResult(data);
}

// ---------------------------------------------------------------------------
// analyzeFrame — primary public API for realtime camera scanning
// Uses the /realtime-frame endpoint (fast_mode, no disk save, returns base64).
// Falls back to Roboflow, then simulation.
// ---------------------------------------------------------------------------
export async function analyzeFrame(base64Image) {
  // --- 1. Try local backend (realtime-frame endpoint — fast mode) ---
  const backendUp = await checkInferenceServiceHealth();
  if (backendUp) {
    try {
      const blob = _base64ToBlob(base64Image, 'image/jpeg');
      return await analyzeRealtimeFrame(blob);
    } catch (err) {
      console.warn('Backend realtime-frame failed, trying Roboflow fallback:', err.message);
    }
  }

  // --- 2. Try Roboflow workflow ---
  if (ROBOFLOW_API_KEY) {
    try {
      return await _analyzeWithRoboflow(base64Image);
    } catch (err) {
      console.warn('Roboflow fallback failed:', err.message);
    }
  }

  // --- 3. Simulation mode (last resort) ---
  console.warn('⚠ Using simulation mode — no real inference backend available.');
  const sim = _simulateDetection();
  return { ...sim, simulationMode: true };
}

function _base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mimeType });
}

// ---------------------------------------------------------------------------
// Roboflow fallback (original logic preserved, hardcoded key removed)
// ---------------------------------------------------------------------------
async function _analyzeWithRoboflow(base64Image) {
  const WORKFLOW_URL =
    `https://detect.roboflow.com/infer/workflows/${ROBOFLOW_WORKSPACE}/${ROBOFLOW_WORKFLOW}`;

  let response = await fetch(WORKFLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: ROBOFLOW_API_KEY,
      inputs: { image: { type: 'base64', value: base64Image } },
    }),
  });

  if (!response.ok) {
    // Try object detection endpoint
    response = await fetch(
      `https://detect.roboflow.com/${ROBOFLOW_MODEL_ID}?api_key=${ROBOFLOW_API_KEY}&confidence=40&overlap=30`,
      { method: 'POST', body: base64Image, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (!response.ok) throw new Error(`Roboflow ${response.status}`);
    const data = await response.json();
    const preds = (data.predictions || []).map((p, i) => ({ ...p, tracker_id: `rf_${i}` }));
    return classifyPredictions(preds);
  }

  const data = await response.json();
  const tracked = data?.outputs?.[0]?.tracked_objects || data?.outputs?.[0]?.byte_tracker || [];
  const result = classifyPredictions(tracked);
  return { ...result, rawTracked: tracked };
}

// ---------------------------------------------------------------------------
// Video upload processing
// ---------------------------------------------------------------------------
export async function processVideoUpload(
  videoFile,
  {
    sessionId,
    detectionMode = 'both',    // 'both' | 'asset_only' | 'defect_only'
    latitude = null,
    longitude = null,
    locationStatus = 'missing',
    onProgress = null,         // callback(progress: 0-100, status: object)
  } = {}
) {
  const backendUp = await checkInferenceServiceHealth();
  if (!backendUp) {
    throw new Error(
      'Inference backend tidak berjalan. Jalankan: cd backend && python -m uvicorn main:app --reload'
    );
  }

  // Upload video & start job
  const fd = new FormData();
  fd.append('video', videoFile, videoFile.name);
  fd.append('session_id', sessionId || '');
  fd.append('detection_mode', detectionMode);
  if (latitude  !== null) fd.append('latitude',  latitude);
  if (longitude !== null) fd.append('longitude', longitude);
  fd.append('location_status', locationStatus);

  const startRes = await fetch(`${INFERENCE_API_URL}/api/inference/video`, {
    method: 'POST', body: fd,
  });
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${startRes.status}`);
  }
  const { job_id } = await startRes.json();

  // Poll for completion
  return await _pollVideoJob(job_id, onProgress);
}

async function _pollVideoJob(jobId, onProgress) {
  const MAX_WAIT_MS  = 30 * 60 * 1000; // 30 min max
  const POLL_INTERVAL_MS = 2_000;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${INFERENCE_API_URL}/api/inference/video/${jobId}/status`);
    if (!res.ok) throw new Error(`Poll error: ${res.status}`);
    const status = await res.json();

    if (onProgress) onProgress(status.progress ?? 0, status);

    if (status.status === 'completed') {
      return _normaliseVideoJobResult(status);
    }
    if (status.status === 'failed') {
      throw new Error(status.error || 'Video processing failed');
    }
  }
  throw new Error('Video processing timed out');
}

export async function pollVideoJobStatus(jobId) {
  const res = await fetch(`${INFERENCE_API_URL}/api/inference/video/${jobId}/status`);
  if (!res.ok) throw new Error(`Poll error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Realtime frame (for future camera mode via backend)
// ---------------------------------------------------------------------------
export async function analyzeRealtimeFrame(
  imageBlob,
  { sessionId, latitude = null, longitude = null, locationStatus = 'gps', frameIndex = 0 } = {}
) {
  const fd = new FormData();
  fd.append('image', imageBlob, 'frame.jpg');
  fd.append('session_id', sessionId || '');
  if (latitude  !== null) fd.append('latitude',  latitude);
  if (longitude !== null) fd.append('longitude', longitude);
  fd.append('location_status', locationStatus);
  fd.append('frame_index', frameIndex);

  const res = await fetch(`${INFERENCE_API_URL}/api/inference/realtime-frame`, {
    method: 'POST', body: fd,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Realtime frame error: ${res.status}`);
  return _normaliseBackendResult(await res.json());
}

// ---------------------------------------------------------------------------
// classifyPredictions — kept for Roboflow compatibility
// ---------------------------------------------------------------------------
export function classifyPredictions(predictions) {
  const damages = [];
  const assets  = [];

  for (const pred of predictions) {
    const cls  = pred.class?.toLowerCase() || '';
    const conf = pred.confidence * 100;

    const dmgEntry = Object.entries(DAMAGE_CLASS_MAP).find(([key]) => cls.includes(key));
    if (dmgEntry) {
      damages.push({
        type:      dmgEntry[1],
        severity:  conf >= 85 ? 'Parah' : conf >= 60 ? 'Sedang' : 'Ringan',
        confidence: Math.round(conf * 10) / 10,
        bbox: { x: pred.x, y: pred.y, width: pred.width, height: pred.height },
        rawClass: pred.class,
      });
      continue;
    }

    const astEntry = Object.entries(ASSET_CLASS_MAP).find(([key]) => cls.includes(key));
    if (astEntry) {
      assets.push({
        type:      astEntry[1],
        condition: conf >= 80 ? 'Baik' : conf >= 50 ? 'Rusak Ringan' : 'Rusak Berat',
        confidence: Math.round(conf * 10) / 10,
        bbox: { x: pred.x, y: pred.y, width: pred.width, height: pred.height },
        rawClass: pred.class,
      });
    }
  }

  return { predictions, damages, assets };
}

// ---------------------------------------------------------------------------
// Internal normalisers
// ---------------------------------------------------------------------------

/**
 * Convert backend unified response → MobileScanner-compatible format.
 * MobileScanner expects { damages: [...], assets: [...], rawTracked }
 */
function _normaliseBackendResult(data) {
  const damages = [];
  const assets  = [];

  for (const det of (data.detections || [])) {
    const label = DAMAGE_CLASS_MAP[det.class_name] || det.class_name;
    const conf  = Math.round(det.confidence * 1000) / 10;  // 0-100 scale

    if (det.category === 'road_defect') {
      damages.push({
        type:      label,
        severity:  SEV_EN_TO_ID[det.severity] || 'Sedang',
        confidence: conf,
        bbox: _xyxy_to_xywh(det.bbox),
        rawClass:  det.class_name,
        category:  det.category,
        severityEn: det.severity,
        maskPolygon: det.mask_polygon,
      });
    } else if (det.category === 'asset') {
      const assetLabel = ASSET_CLASS_MAP[det.class_name] || det.class_name;
      assets.push({
        type:      assetLabel,
        condition: conf >= 80 ? 'Baik' : conf >= 50 ? 'Rusak Ringan' : 'Rusak Berat',
        confidence: conf,
        bbox: _xyxy_to_xywh(det.bbox),
        rawClass:  det.class_name,
        category:  det.category,
        maskPolygon: det.mask_polygon,
      });
    }
  }

  return {
    predictions: data.detections || [],
    damages,
    assets,
    rawTracked: data.detections || [],
    annotatedImageUrl: data.annotated_image_url
      ? `${INFERENCE_API_URL}${data.annotated_image_url}` : null,
    annotatedImageBase64: data.annotated_image_base64 || null,
    originalImageUrl: data.original_image_url
      ? `${INFERENCE_API_URL}${data.original_image_url}` : null,
    locationStatus: data.location_status,
    latitude:  data.latitude,
    longitude: data.longitude,
    timestamp: data.timestamp,
    simulationMode: !!data.simulation_mode,
  };
}

/** Convert x1,y1,x2,y2 bbox to center-based x,y,width,height (Roboflow style) */
function _xyxy_to_xywh(bbox) {
  if (!bbox) return { x: 0, y: 0, width: 0, height: 0 };
  const w = bbox.x2 - bbox.x1;
  const h = bbox.y2 - bbox.y1;
  return { x: bbox.x1 + w / 2, y: bbox.y1 + h / 2, width: w, height: h };
}

function _normaliseVideoJobResult(jobStatus) {
  return {
    jobId:          jobStatus.job_id,
    sessionId:      jobStatus.session_id,
    framesTotal:    jobStatus.frames_total,
    framesProcessed: jobStatus.frames_processed,
    detectionsCount: jobStatus.detections_count,
    eventsCount:    jobStatus.events_count,
    results: (jobStatus.results || []).map(r => ({
      ..._normaliseBackendResult(r),
      frameIndex:           r.frame_index,
      videoTimestampSecond: r.video_timestamp_second,
      latitude:             r.latitude,
      longitude:            r.longitude,
      locationStatus:       r.location_status,
      timestamp:            r.timestamp,
    })),
    events: (jobStatus.events || []).map(ev => ({
      eventId:    ev.event_id,
      className:  ev.category === 'asset'
        ? (ASSET_CLASS_MAP[ev.class_name] || ev.class_name)
        : (DAMAGE_CLASS_MAP[ev.class_name] || ev.class_name),
      classNameRaw: ev.class_name,
      category:   ev.category,
      bestConfidence: ev.best_confidence,
      severity:   ev.severity,
      severityId: SEV_EN_TO_ID[ev.severity] || null,
      firstSeenSecond: ev.first_seen_second,
      lastSeenSecond:  ev.last_seen_second,
      representativeAnnotatedImageUrl: ev.representative_annotated_image_url
        ? `${INFERENCE_API_URL}${ev.representative_annotated_image_url}` : null,
      detectionCount: ev.detection_count,
      latitude:       ev.latitude,
      longitude:      ev.longitude,
      locationStatus: ev.location_status,
    })),
    completedAt: jobStatus.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Simulation mode (last resort)
// ---------------------------------------------------------------------------
function _simulateDetection() {
  const dmgTypes = ['Lubang', 'Retak Memanjang', 'Retak Buaya'];
  const astTypes = ['Lampu Jalan', 'Pembatas Jalan', 'Plang/Rambu'];

  const damages = [{
    type:       dmgTypes[Math.floor(Math.random() * dmgTypes.length)],
    severity:   'Sedang',
    confidence: Math.round((75 + Math.random() * 15) * 10) / 10,
    bbox: { x: 300 + Math.random() * 80, y: 230 + Math.random() * 60, width: 120, height: 90 },
    rawClass: 'simulated_damage',
    category: 'road_defect',
  }];

  const assets = [{
    type:      astTypes[Math.floor(Math.random() * astTypes.length)],
    condition: 'Baik',
    confidence: Math.round((70 + Math.random() * 20) * 10) / 10,
    bbox: { x: 130, y: 120, width: 60, height: 140 },
    rawClass: 'simulated_asset',
    category: 'asset',
  }];

  return { predictions: [], damages, assets, rawTracked: [] };
}

// ---------------------------------------------------------------------------
// Legacy setupInferencePipeline (kept for backward compat with any existing usage)
// ---------------------------------------------------------------------------
export const setupInferencePipeline = async (videoElement, sessionId, onDetection) => {
  let isActive = true;

  const processFrame = async () => {
    if (!isActive || !videoElement || videoElement.paused || videoElement.ended) return;

    try {
      const frameData = captureFrameAsBase64(videoElement);
      if (frameData) {
        const result = await analyzeFrame(frameData.base64);
        if (result.rawTracked?.length > 0) {
          onDetection(result.rawTracked, sessionId);
        }
      }
    } catch (e) {
      console.error('Inference pipeline error:', e);
    }

    if (isActive) setTimeout(() => requestAnimationFrame(processFrame), 66);
  };

  processFrame();
  return () => { isActive = false; };
};
