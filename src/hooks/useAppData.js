import { useState, useEffect } from 'react';
import { supabase, isSupabaseConnected } from '../supabaseClient';
import { TOLL_ROADS, ROAD_SEGMENTS, DAMAGE_REPORTS } from '../data/mockData';

/**
 * Custom hook: Mengambil data dari Supabase jika terkoneksi,
 * atau fallback ke mock data lokal jika belum.
 *
 * Penggunaan di App.jsx:
 *   const { tollRoads, segments, damages, loading, error, usingMock } = useAppData();
 */
export function useAppData() {
  const [tollRoads, setTollRoads] = useState([]);
  const [segments, setSegments] = useState([]);
  const [damages, setDamages] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      // Jika Supabase belum terhubung → gunakan mock data
      if (!isSupabaseConnected()) {
        console.log('📦 Menggunakan mock data lokal');
        setTollRoads(TOLL_ROADS);
        setSegments(ROAD_SEGMENTS);
        setDamages(DAMAGE_REPORTS);
        setUsingMock(true);
        setLoading(false);
        return;
      }

      try {
        console.log('🔌 Mengambil data dari Supabase...');

        // Fetch semua tabel secara paralel
        const [tollRes, segRes, dmgRes] = await Promise.all([
          supabase.from('toll_roads').select('*').order('region').order('name'),
          supabase.from('road_segments').select('*').order('segment_name'),
          supabase.from('damage_reports').select('*').order('quarter_period').order('distance_meter'),
        ]);

        // Cek errors
        if (tollRes.error) throw new Error(`toll_roads: ${tollRes.error.message}`);
        if (segRes.error) throw new Error(`road_segments: ${segRes.error.message}`);
        if (dmgRes.error) throw new Error(`damage_reports: ${dmgRes.error.message}`);

        // Fetch assets (graceful — table may not exist yet)
        let assetsData = [];
        try {
          const assetRes = await supabase.from('toll_assets').select('*').order('scanned_at', { ascending: false });
          if (!assetRes.error) assetsData = assetRes.data || [];
        } catch (_) { /* table doesn't exist yet */ }

        setTollRoads(tollRes.data);
        setSegments(segRes.data);
        setDamages(dmgRes.data);
        setAssets(assetsData);
        setUsingMock(false);

        console.log(
          `✅ Data Supabase dimuat: ${tollRes.data.length} ruas, ` +
          `${segRes.data.length} segmen, ${dmgRes.data.length} laporan kerusakan, ` +
          `${assetsData.length} aset`
        );
      } catch (err) {
        console.error('❌ Gagal memuat dari Supabase, fallback ke mock:', err);
        setError(err.message);
        // Fallback ke mock data
        setTollRoads(TOLL_ROADS);
        setSegments(ROAD_SEGMENTS);
        setDamages(DAMAGE_REPORTS);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const updateTollRoadGeometry = async (tollRoadId, newPathCoordinates) => {
    if (!isSupabaseConnected()) {
      console.warn('⚠️ Mode Mock Data: Perubahan geometri tidak disimpan ke database permanen.');
      // Update state local only
      setTollRoads(prev => prev.map(tr => 
        tr.id === tollRoadId ? { ...tr, path_geometry: newPathCoordinates } : tr
      ));
      return true;
    }

    try {
      const { error } = await supabase
        .from('toll_roads')
        .update({ path_geometry: newPathCoordinates })
        .eq('id', tollRoadId);
        
      if (error) throw error;
      
      // Update local state so it reflects instantly without refetching
      setTollRoads(prev => prev.map(tr => 
        tr.id === tollRoadId ? { ...tr, path_geometry: newPathCoordinates } : tr
      ));
      return true;
    } catch (err) {
      console.error('❌ Gagal menyimpan geometri rute:', err);
      return false;
    }
  };

  return { tollRoads, segments, damages, assets, loading, error, usingMock, updateTollRoadGeometry };
}
