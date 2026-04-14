import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, MapPin, Zap, StopCircle, ChevronLeft, AlertTriangle,
  Gauge, Clock, Upload, CheckCircle, XCircle, Loader2, Crosshair,
  Lightbulb, ShieldAlert, Signpost, Eye
} from 'lucide-react';
import { analyzeFrame, captureFrameAsBase64 } from '../utils/cvEngine';
import { supabase, isSupabaseConnected } from '../supabaseClient';

const ASSET_ICONS = {
  'Lampu Jalan': '💡',
  'Pembatas Jalan': '🚧',
  'Plang/Rambu': '🪧',
  'Guardrail': '🛡️',
  'CCTV': '📹',
  'Gantry Tol': '🏗️',
  'Lainnya': '📦',
};

const SEVERITY_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah: '#EF4444',
};

export default function MobileScanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasOverlayRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);

  // ---- State ----
  const [phase, setPhase] = useState('setup'); // setup | scanning | results
  const [inspectorName, setInspectorName] = useState('');
  const [selectedTollRoadId, setSelectedTollRoadId] = useState('');
  const [tollRoads, setTollRoads] = useState([]);

  // GPS
  const [currentPos, setCurrentPos] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [gpsTrack, setGpsTrack] = useState([]);

  // Camera
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Scanning
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [currentFrameStats, setCurrentFrameStats] = useState({ damages: [], assets: [] });
  const [detectionQueue, setDetectionQueue] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStartTime, setScanStartTime] = useState(null);
  const [autoMode, setAutoMode] = useState(true);
  const [detectionMode, setDetectionMode] = useState('keduanya'); // 'keduanya', 'hanya_asset', 'hanya_kerusakan'

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const lastUploadRef = useRef(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  // ---- Fetch toll roads & default segment on mount ----
  useEffect(() => {
    async function loadTollRoads() {
      if (isSupabaseConnected()) {
        const { data } = await supabase.from('toll_roads').select('id, name').order('name');
        if (data) setTollRoads(data);
      }
    }
    loadTollRoads();
  }, []);

  useEffect(() => {
    if (selectedTollRoadId && isSupabaseConnected()) {
      supabase.from('road_segments').select('id').eq('toll_road_id', selectedTollRoadId).limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) setSelectedSegmentId(data[0].id);
        });
    } else {
      setSelectedSegmentId(null);
    }
  }, [selectedTollRoadId]);

  // ---- Start camera ----
  const startCamera = useCallback(async () => {
    try {
      // Try environment (rear) camera first, fall back to any available
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (_) {
        // Fallback: use any camera (e.g. laptop webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait until video actually has frames before marking ready
        videoRef.current.onloadeddata = () => {
          setCameraReady(true);
          console.log('📷 Kamera siap:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        };
        await videoRef.current.play();
      }
      setCameraError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
    }
  }, []);

  // ---- Start GPS ----
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setCurrentPos(coord);
        setSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0); // m/s → km/h
        setGpsTrack(prev => [...prev, [coord.lng, coord.lat]]);
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, []);

  // ---- Stop everything ----
  const stopAll = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setCameraReady(false);
    setIsScanning(false);
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  // ---- Bake Detections To Blob ----
  const bakeDetectionsToBlob = async (dataUrl, result, frameW, frameH) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, frameW, frameH);

        result.damages.forEach(d => {
          const x = (d.bbox.x - d.bbox.width / 2);
          const y = (d.bbox.y - d.bbox.height / 2);
          const w = d.bbox.width;
          const h = d.bbox.height;
          ctx.strokeStyle = SEVERITY_COLORS[d.severity] || '#EF4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = SEVERITY_COLORS[d.severity] || '#EF4444';
          ctx.fillRect(x, y - 22, ctx.measureText(`${d.type} ${d.confidence}%`).width + 12, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`${d.type} ${d.confidence}%`, x + 4, y - 6);
        });

        result.assets.forEach(a => {
          const x = (a.bbox.x - a.bbox.width / 2);
          const y = (a.bbox.y - a.bbox.height / 2);
          const w = a.bbox.width;
          const h = a.bbox.height;
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(x, y - 22, ctx.measureText(`${a.type} ${a.confidence}%`).width + 12, 22);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`${a.type} ${a.confidence}%`, x + 4, y - 6);
        });

        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
      };
      img.src = dataUrl;
    });
  };

  // ---- Auto-Upload Background Request ----
  const autoUploadDetection = async (det) => {
    if (!isSupabaseConnected()) return;
    try {
      let imageUrl = null;
      if (det.imageBlob) {
        const fileName = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { data: uploadData } = await supabase.storage
          .from('scan-photos')
          .upload(fileName, det.imageBlob, { contentType: 'image/jpeg' });
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('scan-photos').getPublicUrl(fileName);
          imageUrl = urlData?.publicUrl;
        }
      }

      const tasks = [];
      
      for (const dmg of det.damages) {
        if (!det.position || !selectedSegmentId) continue;
        tasks.push(supabase.from('damage_reports').insert({
          segment_id: selectedSegmentId,
          damage_type: dmg.type,
          severity: dmg.severity,
          lat: det.position.lat,
          lng: det.position.lng,
          distance_meter: 0,
          quarter_period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
          image_url: imageUrl,
          ai_confidence: dmg.confidence,
          source: 'ai_scanner',
          scanned_at: det.timestamp,
        }));
      }

      for (const ast of det.assets) {
         if (!det.position) continue;
         tasks.push(supabase.from('toll_assets').insert({
           toll_road_id: selectedTollRoadId || null,
           asset_type: ast.type,
           lat: det.position.lat,
           lng: det.position.lng,
           condition: ast.condition,
           image_url: imageUrl,
           ai_confidence: ast.confidence,
           scanned_at: det.timestamp,
         }));
      }

      await Promise.all(tasks);
      console.log('✅ Auto-uploaded 1 detection batch');
    } catch (e) {
      console.error('Auto upload error:', e);
    }
  };

  // ---- Capture & Analyze single frame ----
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !cameraReady || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const frame = captureFrameAsBase64(videoRef.current);
      if (!frame) {
        setIsAnalyzing(false);
        return;
      }
      const result = await analyzeFrame(frame.base64);

      if (result.error) {
        // Stop scan agar user baca errornya
        setIsScanning(false);
        setCameraError(result.error);
        setIsAnalyzing(false);
        return;
      }

      setScanCount(prev => prev + 1);

      let finalDamages = result.damages;
      let finalAssets = result.assets;
      if (detectionMode === 'hanya_asset') finalDamages = [];
      if (detectionMode === 'hanya_kerusakan') finalAssets = [];

      setCurrentFrameStats({ damages: finalDamages, assets: finalAssets });
      drawDetections({ damages: finalDamages, assets: finalAssets }, frame.width, frame.height);

      if (finalDamages.length > 0 || finalAssets.length > 0) {
        const bakedBlob = await bakeDetectionsToBlob(
          frame.dataUrl, 
          { damages: finalDamages, assets: finalAssets }, 
          frame.width, 
          frame.height
        );

        const detection = {
          id: `det-${Date.now()}`,
          timestamp: new Date().toISOString(),
          position: currentPos ? { ...currentPos } : null,
          imageDataUrl: URL.createObjectURL(bakedBlob),
          imageBlob: bakedBlob,
          damages: finalDamages,
          assets: finalAssets,
          frameSize: { width: frame.width, height: frame.height },
        };

        setLastDetection(detection);
        setDetectionQueue(prev => [...prev, detection]);

        // Auto-upload if no cooldown (3 seconds throttle per upload batch)
        const now = Date.now();
        if (now - lastUploadRef.current > 3000) {
           lastUploadRef.current = now;
           autoUploadDetection(detection);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraReady, isAnalyzing, currentPos, detectionMode, selectedSegmentId, selectedTollRoadId]);

  // ---- Draw bounding boxes on overlay canvas ----
  const drawDetections = useCallback((result, frameW, frameH) => {
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / frameW;
    const scaleY = canvas.height / frameH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw damage boxes
    result.damages.forEach(d => {
      const x = (d.bbox.x - d.bbox.width / 2) * scaleX;
      const y = (d.bbox.y - d.bbox.height / 2) * scaleY;
      const w = d.bbox.width * scaleX;
      const h = d.bbox.height * scaleY;

      ctx.strokeStyle = SEVERITY_COLORS[d.severity] || '#EF4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = SEVERITY_COLORS[d.severity] || '#EF4444';
      ctx.fillRect(x, y - 22, ctx.measureText(`${d.type} ${d.confidence}%`).width + 12, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${d.type} ${d.confidence}%`, x + 4, y - 6);
    });

    // Draw asset boxes
    result.assets.forEach(a => {
      const x = (a.bbox.x - a.bbox.width / 2) * scaleX;
      const y = (a.bbox.y - a.bbox.height / 2) * scaleY;
      const w = a.bbox.width * scaleX;
      const h = a.bbox.height * scaleY;

      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x, y - 22, ctx.measureText(`${a.type} ${a.confidence}%`).width + 12, 22);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${a.type} ${a.confidence}%`, x + 4, y - 6);
    });
  }, []);

  // ---- Auto-scan loop (Real-time polling) ----
  useEffect(() => {
    let active = true;

    const runLoop = async () => {
      while (active && isScanning && autoMode) {
        if (!isAnalyzing && cameraReady) {
          await captureAndAnalyze();
        }
        // Jeda minimal agar tidak freeze UI
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    };

    if (isScanning && autoMode) {
      runLoop();
    }

    return () => {
      active = false;
    };
  }, [isScanning, autoMode, cameraReady, isAnalyzing, captureAndAnalyze]);

  // ---- Begin scanning session ----
  const beginSession = () => {
    startGPS();
    setScanStartTime(new Date());
    setDetectionQueue([]);
    setScanCount(0);
    setPhase('scanning');
    setIsScanning(true);
  };

  // Trigger camera start after phase changes to scanning and video element exists
  useEffect(() => {
    if (phase === 'scanning' && !cameraReady && !streamRef.current) {
      startCamera();
    }
  }, [phase, cameraReady, startCamera]);

  // ---- End session & show results ----
  const endSession = () => {
    stopAll();
    setPhase('results');
  };

  // ---- Upload all detections to Supabase ----
  const uploadToSupabase = async () => {
    if (!isSupabaseConnected()) {
      alert('Supabase belum terkoneksi. Data disimpan secara lokal saja.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const total = detectionQueue.length;
    let uploaded = 0;

    // Create scan session
    const { data: session } = await supabase.from('scan_sessions').insert({
      toll_road_id: selectedTollRoadId || null,
      inspector_name: inspectorName || 'Petugas Anonim',
      start_time: scanStartTime?.toISOString(),
      end_time: new Date().toISOString(),
      total_damages: detectionQueue.reduce((s, d) => s + d.damages.length, 0),
      total_assets: detectionQueue.reduce((s, d) => s + d.assets.length, 0),
      route_geometry: gpsTrack,
    }).select().single();

    for (const det of detectionQueue) {
      try {
        // Upload photo to Storage
        let imageUrl = null;
        if (det.imageBlob) {
          const fileName = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
          const { data: uploadData } = await supabase.storage
            .from('scan-photos')
            .upload(fileName, det.imageBlob, { contentType: 'image/jpeg' });

          if (uploadData) {
            const { data: urlData } = supabase.storage.from('scan-photos').getPublicUrl(fileName);
            imageUrl = urlData?.publicUrl;
          }
        }

        // Insert damages
        for (const dmg of det.damages) {
          if (!det.position) continue;
          
          // Find nearest segment (simplified: just use first segment of toll road)
          let segmentId = null;
          if (selectedTollRoadId) {
            const { data: segs } = await supabase
              .from('road_segments')
              .select('id')
              .eq('toll_road_id', selectedTollRoadId)
              .limit(1);
            segmentId = segs?.[0]?.id;
          }

          if (segmentId) {
            await supabase.from('damage_reports').insert({
              segment_id: segmentId,
              damage_type: dmg.type,
              severity: dmg.severity,
              lat: det.position.lat,
              lng: det.position.lng,
              distance_meter: 0,
              quarter_period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
              image_url: imageUrl,
              ai_confidence: dmg.confidence,
              source: 'ai_scanner',
              scanned_at: det.timestamp,
            });
          }
        }

        // Insert assets
        for (const ast of det.assets) {
          if (!det.position) continue;
          await supabase.from('toll_assets').insert({
            toll_road_id: selectedTollRoadId || null,
            asset_type: ast.type,
            lat: det.position.lat,
            lng: det.position.lng,
            condition: ast.condition,
            image_url: imageUrl,
            ai_confidence: ast.confidence,
            scanned_at: det.timestamp,
          });
        }

        uploaded++;
        setUploadProgress(Math.round((uploaded / total) * 100));
      } catch (err) {
        console.error('Upload error for detection:', err);
      }
    }

    setIsUploading(false);
    alert(`✅ Berhasil meng-upload ${uploaded} deteksi ke database!`);
  };

  // ---- Stats ----
  const totalDamages = detectionQueue.reduce((s, d) => s + d.damages.length, 0);
  const totalAssets = detectionQueue.reduce((s, d) => s + d.assets.length, 0);
  const elapsed = scanStartTime
    ? Math.round((Date.now() - scanStartTime.getTime()) / 1000)
    : 0;

  // ======================= RENDER =======================

  // ---- SETUP PHASE ----
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold">🔍 AI Road Scanner</h1>
            <p className="text-xs text-surface-400">Inspeksi Jalan Tol dengan Computer Vision</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 gap-6 max-w-md mx-auto w-full">
          {/* Inspector Name */}
          <div>
            <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Nama Petugas</label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Masukkan nama Anda"
              className="w-full bg-surface-700/60 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder:text-surface-500 outline-none focus:border-hka-red transition-colors"
            />
          </div>

          {/* Toll Road Selection */}
          <div>
            <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Ruas Tol</label>
            <select
              value={selectedTollRoadId}
              onChange={(e) => setSelectedTollRoadId(e.target.value)}
              className="w-full bg-surface-700/60 border border-surface-600 rounded-xl px-4 py-3 text-white outline-none focus:border-hka-red transition-colors appearance-none"
            >
              <option value="">— Pilih ruas jalan tol —</option>
              {tollRoads.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Selection */}
          <div>
            <label className="text-xs text-surface-400 uppercase tracking-wider mb-2 block">Tipe Deteksi</label>
            <div className="flex bg-surface-700/60 p-1 rounded-xl">
              {['Keduanya', 'Hanya Aset', 'Hanya Kerusakan'].map(mode => {
                const mapValue = mode === 'Keduanya' ? 'keduanya' : mode === 'Hanya Aset' ? 'hanya_asset' : 'hanya_kerusakan';
                return (
                  <button
                    key={mode}
                    onClick={() => setDetectionMode(mapValue)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      detectionMode === mapValue
                        ? 'bg-hka-red text-white shadow'
                        : 'text-surface-300 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-surface-500 mt-2 px-1">
              ✨ Scan berjalan <span className="text-hka-red font-semibold">Real-time</span> dan akan di-upload seketika saat terdeteksi.
            </p>
          </div>

          {/* Features */}
          <div className="bg-surface-700/40 rounded-xl p-4 space-y-2">
            <p className="text-xs text-surface-400 font-semibold mb-2">FITUR SCANNER:</p>
            <Feature icon="📷" text="Kamera belakang HP otomatis aktif" />
            <Feature icon="📍" text="GPS real-time tracking posisi kendaraan" />
            <Feature icon="🤖" text="AI Computer Vision deteksi kerusakan jalan" />
            <Feature icon="🏗️" text="Deteksi aset tol (lampu, pembatas, plang)" />
            <Feature icon="☁️" text="Upload otomatis ke database Supabase" />
          </div>

          {/* Start Button */}
          <button
            onClick={beginSession}
            className="w-full py-4 bg-gradient-to-r from-hka-red to-red-600 text-white text-lg font-bold rounded-2xl shadow-xl shadow-red-900/40 hover:shadow-red-900/60 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Camera size={24} /> Mulai Inspeksi
          </button>
        </div>
      </div>
    );
  }

  // ---- SCANNING PHASE ----
  if (phase === 'scanning') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasOverlayRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <div className="bg-red-900/60 border border-red-500 rounded-xl p-5 text-center max-w-xs">
                <XCircle size={40} className="mx-auto mb-3 text-red-400" />
                <p className="text-red-200 text-sm">{cameraError}</p>
              </div>
            </div>
          )}

          {/* AI Analyzing Indicator */}
          {isAnalyzing && (
            <div className="absolute top-[140px] left-1/2 -translate-x-1/2 bg-hka-red/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse z-20">
              <Loader2 size={14} className="animate-spin" /> Menganalisis...
            </div>
          )}

          {/* Top Real-time Indicators */}
          <div className="absolute top-4 inset-x-4 z-20 flex flex-col gap-2 pointer-events-none">
            {/* Kerusakan Panel */}
            {detectionMode !== 'hanya_asset' && (
              <div className="bg-surface-900/80 backdrop-blur-md rounded-xl p-3 border border-red-500/30 shadow-xl">
                <p className="text-[10px] text-surface-400 font-bold mb-1.5 uppercase tracking-wider">Kerusakan Jalan</p>
                {currentFrameStats.damages.length === 0 ? (
                  <p className="text-xs text-green-400 font-semibold flex items-center gap-1">✅ Tidak ada kerusakan</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentFrameStats.damages.reduce((acc, d) => {
                      acc[d.type] = (acc[d.type] || 0) + 1;
                      return acc;
                    }, {})).map(([type, count]) => (
                      <div key={type} className="bg-red-500/20 border border-red-500/50 text-red-100 text-xs px-2 py-1 rounded-lg font-bold flex gap-1 items-center">
                         <span>{type}: {count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aset Panel */}
            {detectionMode !== 'hanya_kerusakan' && (
              <div className="bg-surface-900/80 backdrop-blur-md rounded-xl p-3 border border-blue-500/30 shadow-xl">
                <p className="text-[10px] text-surface-400 font-bold mb-1.5 uppercase tracking-wider">Aset Toll</p>
                {currentFrameStats.assets.length === 0 ? (
                  <p className="text-xs text-surface-500 flex items-center gap-1 font-semibold">Tidak ada aset</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentFrameStats.assets.reduce((acc, a) => {
                      acc[a.type] = (acc[a.type] || 0) + 1;
                      return acc;
                    }, {})).map(([type, count]) => (
                      <div key={type} className="bg-blue-500/20 border border-blue-500/50 text-blue-100 text-xs px-2 py-1 rounded-lg font-bold flex gap-1 items-center">
                         <span>{ASSET_ICONS[type] || '📌'} {type}: {count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="bg-surface-900/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 safe-area-bottom">
          {/* Stats Row */}
          <div className="flex items-center justify-between text-white mb-3">
            <div className="flex items-center gap-1 text-xs">
              <MapPin size={12} className="text-green-400" />
              {currentPos ? (
                <span className="font-mono text-[10px]">
                  {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
                </span>
              ) : (
                <span className="text-surface-500">Mencari GPS...</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Gauge size={12} className="text-blue-400" />
              <span>{speed} km/h</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock size={12} className="text-amber-400" />
              <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Detection Summary */}
          <div className="flex items-center gap-3 mb-3">
            <StatPill color="bg-red-500/20 text-red-400" icon={<AlertTriangle size={12} />} label="Kerusakan" value={totalDamages} />
            <StatPill color="bg-blue-500/20 text-blue-400" icon={<Lightbulb size={12} />} label="Aset" value={totalAssets} />
            <StatPill color="bg-surface-700 text-surface-300" icon={<Eye size={12} />} label="Scan" value={scanCount} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Manual Capture */}
            <button
              onClick={captureAndAnalyze}
              disabled={isAnalyzing || !cameraReady}
              className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40"
            >
              <Crosshair size={18} /> Capture
            </button>

            {/* Auto Toggle */}
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                autoMode ? 'bg-green-600 text-white' : 'bg-surface-700 text-surface-400'
              }`}
            >
              <Zap size={16} /> Auto
            </button>

            {/* Stop */}
            <button
              onClick={endSession}
              className="px-4 py-3 bg-red-600 rounded-xl text-white text-sm font-bold flex items-center gap-2 hover:bg-red-700 active:scale-95 transition-all"
            >
              <StopCircle size={18} /> Selesai
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- RESULTS PHASE ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold">📊 Hasil Inspeksi</h1>
          <p className="text-xs text-surface-400">
            {inspectorName || 'Petugas'} • {new Date(scanStartTime).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-24">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Kerusakan" value={totalDamages} emoji="⚠️" bg="bg-red-500/10 border-red-500/30" />
          <ResultCard label="Aset" value={totalAssets} emoji="🏗️" bg="bg-blue-500/10 border-blue-500/30" />
          <ResultCard label="Total Scan" value={scanCount} emoji="📷" bg="bg-surface-700/50 border-surface-600" />
        </div>

        {/* Duration */}
        <div className="bg-surface-700/40 rounded-xl p-4 flex items-center gap-4">
          <Clock size={20} className="text-amber-400" />
          <div>
            <p className="text-sm font-semibold">Durasi Inspeksi</p>
            <p className="text-xs text-surface-400">
              {Math.floor(elapsed / 60)} menit {elapsed % 60} detik • {gpsTrack.length} titik GPS
            </p>
          </div>
        </div>

        {/* Detection List */}
        <div>
          <h3 className="text-xs text-surface-400 uppercase tracking-wider font-semibold mb-3">
            Detail Deteksi ({detectionQueue.length})
          </h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {detectionQueue.map((det, idx) => (
              <div key={det.id} className="bg-surface-700/40 rounded-xl p-3 flex items-start gap-3">
                {det.imageDataUrl && (
                  <img src={det.imageDataUrl} className="w-16 h-12 rounded-lg object-cover shrink-0" alt={`Detection ${idx + 1}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-400 font-mono">
                    #{idx + 1} • {new Date(det.timestamp).toLocaleTimeString('id-ID')}
                  </p>
                  {det.damages.map((d, i) => (
                    <p key={i} className="text-sm flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{background: SEVERITY_COLORS[d.severity]}} />
                      <span className="truncate">{d.type}</span>
                      <span className="text-surface-400 text-xs">({d.severity}, {d.confidence}%)</span>
                    </p>
                  ))}
                  {det.assets.map((a, i) => (
                    <p key={i} className="text-sm flex items-center gap-1.5 mt-0.5">
                      <span>{ASSET_ICONS[a.type]}</span>
                      <span className="truncate">{a.type}</span>
                      <span className="text-surface-400 text-xs">({a.confidence}%)</span>
                    </p>
                  ))}
                  {det.position && (
                    <p className="text-[10px] text-surface-500 mt-1 font-mono">
                      📍 {det.position.lat.toFixed(5)}, {det.position.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {detectionQueue.length === 0 && (
              <div className="text-center text-surface-500 py-8">
                <Camera size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tidak ada deteksi tercatat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur-sm border-t border-white/10 p-4 safe-area-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-gradient-to-r from-surface-700 to-surface-600 rounded-xl text-white text-sm font-bold shadow-lg"
          >
            Selesai & Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub components ----
function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-xs text-surface-300">
      <span>{icon}</span> {text}
    </div>
  );
}

function StatPill({ color, icon, label, value }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
      {icon} {value} {label}
    </div>
  );
}

function ResultCard({ label, value, emoji, bg }) {
  return (
    <div className={`${bg} border rounded-xl p-3 text-center`}>
      <p className="text-2xl mb-0.5">{emoji}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] text-surface-400">{label}</p>
    </div>
  );
}
