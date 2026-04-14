import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useHighwayDetection() {
  const [detectedObjCounts, setDetectedObjCounts] = useState({});
  const trackedIds = useRef(new Set());
  const batchQueue = useRef([]);
  const uploadTimer = useRef(null);

  // Fungsi internal untuk mem-batch upload (men-trigger eksekusi setiap interval)
  const flushBatchQueue = async () => {
    if (batchQueue.current.length === 0) return;
    
    const payload = [...batchQueue.current];
    batchQueue.current = []; // Reset queue
    
    try {
      const { error } = await supabase.from('highway_monitoring').insert(payload);
      if (error) throw error;
      console.log(`✅ Uploaded batch of ${payload.length} objects.`);
    } catch (err) {
      console.error('❌ Failed to upload batch:', err);
      // Kembalikan objek ke queue jika gagal
      batchQueue.current = [...payload, ...batchQueue.current];
    }
  };

  // Jalankan queue interval per 10 detik
  useEffect(() => {
    uploadTimer.current = setInterval(flushBatchQueue, 10000);
    return () => clearInterval(uploadTimer.current);
  }, []);

  // Fungsi Utama
  const handleNewDetection = useCallback((trackedObjects, sessionId, currentPos) => {
    // 1. Filter confidence sedikit lebih rendah karena getaran kendaraan (~0.45 threshold minimal disarankan, atau 0.40 sesuai opsi user)
    const validObjects = trackedObjects.filter(obj => obj.confidence >= 0.40);

    validObjects.forEach(obj => {
      // 2. Cegah duplikasi per session (Hanya proses TRACK_ID yang belum tersimpan)
      const uniqueId = `${sessionId}_${obj.tracker_id}`;
      
      if (!trackedIds.current.has(uniqueId)) {
        trackedIds.current.add(uniqueId);
        
        // 3. Update Dashboard Counters
        setDetectedObjCounts(prev => ({
          ...prev,
          [obj.class]: (prev[obj.class] || 0) + 1
        }));

        // 4. Masukkan ke Batching System
        batchQueue.current.push({
          session_id: sessionId,
          object_class: obj.class,
          track_id: obj.tracker_id,
          confidence: obj.confidence,
          lat: currentPos?.lat || null,
          lng: currentPos?.lng || null,
          image_url: null, // Lampirkan snapshot link logika jika ada upload Supabase Storage
        });
      }
    });
  }, []);

  return { detectedObjCounts, handleNewDetection };
}
