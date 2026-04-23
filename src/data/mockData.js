/**
 * Local mock data — used when Supabase is not yet connected.
 * Mirrors the SQL schema exactly so switching to live data is seamless.
 */

export const TOLL_ROADS = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: 'Jalan Tol Lingkar Luar Jakarta (JORR)', region: 'Jakarta', total_km: 65, condition_good_percentage: 91.0 },
  { id: 'a1000000-0000-0000-0000-000000000002', name: 'Tol Jagorawi', region: 'Jakarta', total_km: 46, condition_good_percentage: 88.5 },
  { id: 'a1000000-0000-0000-0000-000000000003', name: 'Tol Cikampek - Purwakarta - Padalarang', region: 'Jakarta', total_km: 58, condition_good_percentage: 85.2 },
  { id: 'a1000000-0000-0000-0000-000000000004', name: 'Tol Terbanggi Besar - Kayu Agung', region: 'Trans Sumatera', total_km: 189, condition_good_percentage: 93.1 },
  { id: 'a1000000-0000-0000-0000-000000000005', name: 'Tol Bakauheni - Terbanggi Besar', region: 'Trans Sumatera', total_km: 140.9, condition_good_percentage: 94.5 },
  { id: 'a1000000-0000-0000-0000-000000000006', name: 'Tol Pekanbaru - Dumai', region: 'Trans Sumatera', total_km: 131, condition_good_percentage: 90.8 },
  // === MEDAN - BINJAI ===
  { id: 'd1000000-0000-0000-0000-000000000001', name: 'Tol Medan - Binjai', region: 'Trans Sumatera', total_km: 16.8, condition_good_percentage: 87.3 },
];

export const ROAD_SEGMENTS = [
  // JORR
  { id: 'b1000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000001', segment_name: 'Km 0-1' },
  { id: 'b1000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000001', segment_name: 'Km 1-2' },
  { id: 'b1000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000001', segment_name: 'Km 2-3' },
  { id: 'b1000000-0000-0000-0000-000000000004', toll_road_id: 'a1000000-0000-0000-0000-000000000001', segment_name: 'Km 3-4' },
  { id: 'b1000000-0000-0000-0000-000000000005', toll_road_id: 'a1000000-0000-0000-0000-000000000001', segment_name: 'Km 4-5' },
  // Jagorawi
  { id: 'b2000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000002', segment_name: 'Km 0-1' },
  { id: 'b2000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000002', segment_name: 'Km 1-2' },
  { id: 'b2000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000002', segment_name: 'Km 2-3' },
  // Terbanggi - Kayu Agung
  { id: 'b3000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000004', segment_name: 'Km 0-1' },
  { id: 'b3000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000004', segment_name: 'Km 1-2' },
  { id: 'b3000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000004', segment_name: 'Km 2-3' },
  { id: 'b3000000-0000-0000-0000-000000000004', toll_road_id: 'a1000000-0000-0000-0000-000000000004', segment_name: 'Km 3-4' },
  // Bakauheni - Terbanggi Besar (20 Segmen)
  { id: 'b4000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 0-1' },
  { id: 'b4000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 1-2' },
  { id: 'b4000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 2-3' },
  { id: 'b4000000-0000-0000-0000-000000000004', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 3-4' },
  { id: 'b4000000-0000-0000-0000-000000000005', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 4-5' },
  { id: 'b4000000-0000-0000-0000-000000000006', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 5-6' },
  { id: 'b4000000-0000-0000-0000-000000000007', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 6-7' },
  { id: 'b4000000-0000-0000-0000-000000000008', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 7-8' },
  { id: 'b4000000-0000-0000-0000-000000000009', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 8-9' },
  { id: 'b4000000-0000-0000-0000-000000000010', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 9-10' },
  { id: 'b4000000-0000-0000-0000-000000000011', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 10-11' },
  { id: 'b4000000-0000-0000-0000-000000000012', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 11-12' },
  { id: 'b4000000-0000-0000-0000-000000000013', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 12-13' },
  { id: 'b4000000-0000-0000-0000-000000000014', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 13-14' },
  { id: 'b4000000-0000-0000-0000-000000000015', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 14-15' },
  { id: 'b4000000-0000-0000-0000-000000000016', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 15-16' },
  { id: 'b4000000-0000-0000-0000-000000000017', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 16-17' },
  { id: 'b4000000-0000-0000-0000-000000000018', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 17-18' },
  { id: 'b4000000-0000-0000-0000-000000000019', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 18-19' },
  { id: 'b4000000-0000-0000-0000-000000000020', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 19-20' },
  // Pekanbaru - Dumai
  { id: 'b5000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000006', segment_name: 'Km 0-1' },
  { id: 'b5000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000006', segment_name: 'Km 1-2' },
  // Cikampek
  { id: 'b6000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 0-1' },
  { id: 'b6000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 1-2' },
  { id: 'b6000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 2-3' },
  // === MEDAN - BINJAI (16 Segmen) ===
  { id: 'd2000000-0000-0000-0000-000000000001', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 0-1' },
  { id: 'd2000000-0000-0000-0000-000000000002', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 1-2' },
  { id: 'd2000000-0000-0000-0000-000000000003', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 2-3' },
  { id: 'd2000000-0000-0000-0000-000000000004', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 3-4' },
  { id: 'd2000000-0000-0000-0000-000000000005', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 4-5' },
  { id: 'd2000000-0000-0000-0000-000000000006', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 5-6' },
  { id: 'd2000000-0000-0000-0000-000000000007', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 6-7' },
  { id: 'd2000000-0000-0000-0000-000000000008', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 7-8' },
  { id: 'd2000000-0000-0000-0000-000000000009', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 8-9' },
  { id: 'd2000000-0000-0000-0000-000000000010', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 9-10' },
  { id: 'd2000000-0000-0000-0000-000000000011', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 10-11' },
  { id: 'd2000000-0000-0000-0000-000000000012', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 11-12' },
  { id: 'd2000000-0000-0000-0000-000000000013', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 12-13' },
  { id: 'd2000000-0000-0000-0000-000000000014', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 13-14' },
  { id: 'd2000000-0000-0000-0000-000000000015', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 14-15' },
  { id: 'd2000000-0000-0000-0000-000000000016', toll_road_id: 'd1000000-0000-0000-0000-000000000001', segment_name: 'Km 15-16' },
];

export const DAMAGE_REPORTS = [
  // ========================
  // JORR - Km 0-1
  // ========================
  { id: 'd001', segment_id: 'b1000000-0000-0000-0000-000000000001', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -6.2850, lng: 106.8450, distance_meter: 150, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.5 },
  { id: 'd002', segment_id: 'b1000000-0000-0000-0000-000000000001', damage_type: 'Lubang', severity: 'Parah', lat: -6.2855, lng: 106.8455, distance_meter: 320, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.8 },
  { id: 'd003', segment_id: 'b1000000-0000-0000-0000-000000000001', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -6.2860, lng: 106.8460, distance_meter: 480, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.3 },
  // JORR - Km 1-2
  { id: 'd004', segment_id: 'b1000000-0000-0000-0000-000000000002', damage_type: 'Retak Melintang', severity: 'Ringan', lat: -6.2870, lng: 106.8470, distance_meter: 850, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.2 },
  { id: 'd005', segment_id: 'b1000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Sedang', lat: -6.2875, lng: 106.8475, distance_meter: 920, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.6 },
  // JORR - Km 2-3
  { id: 'd006', segment_id: 'b1000000-0000-0000-0000-000000000003', damage_type: 'Retak Buaya', severity: 'Parah', lat: -6.2880, lng: 106.8480, distance_meter: 200, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.1 },
  { id: 'd007', segment_id: 'b1000000-0000-0000-0000-000000000003', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -6.2885, lng: 106.8485, distance_meter: 550, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.7 },
  // JORR - Km 3-4
  { id: 'd008', segment_id: 'b1000000-0000-0000-0000-000000000004', damage_type: 'Lubang', severity: 'Ringan', lat: -6.2890, lng: 106.8490, distance_meter: 100, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.4 },
  { id: 'd009', segment_id: 'b1000000-0000-0000-0000-000000000004', damage_type: 'Retak Melintang', severity: 'Parah', lat: -6.2895, lng: 106.8495, distance_meter: 700, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.2 },
  // JORR - Km 4-5
  { id: 'd010', segment_id: 'b1000000-0000-0000-0000-000000000005', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -6.2900, lng: 106.8500, distance_meter: 350, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.9 },
  // Jagorawi
  { id: 'd011', segment_id: 'b2000000-0000-0000-0000-000000000001', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -6.3050, lng: 106.8600, distance_meter: 250, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.0 },
  { id: 'd012', segment_id: 'b2000000-0000-0000-0000-000000000001', damage_type: 'Lubang', severity: 'Parah', lat: -6.3055, lng: 106.8605, distance_meter: 600, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.3 },
  { id: 'd013', segment_id: 'b2000000-0000-0000-0000-000000000002', damage_type: 'Retak Buaya', severity: 'Ringan', lat: -6.3060, lng: 106.8610, distance_meter: 400, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.5 },
  { id: 'd014', segment_id: 'b2000000-0000-0000-0000-000000000003', damage_type: 'Retak Melintang', severity: 'Sedang', lat: -6.3070, lng: 106.8620, distance_meter: 780, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.8 },
  // Terbanggi - Kayu Agung
  { id: 'd015', segment_id: 'b3000000-0000-0000-0000-000000000001', damage_type: 'Lubang', severity: 'Sedang', lat: -4.5100, lng: 105.2600, distance_meter: 120, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.1 },
  { id: 'd016', segment_id: 'b3000000-0000-0000-0000-000000000002', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -4.5200, lng: 105.2700, distance_meter: 500, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.2 },
  { id: 'd017', segment_id: 'b3000000-0000-0000-0000-000000000003', damage_type: 'Retak Buaya', severity: 'Parah', lat: -4.5300, lng: 105.2800, distance_meter: 900, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.0 },
  { id: 'd018', segment_id: 'b3000000-0000-0000-0000-000000000004', damage_type: 'Retak Melintang', severity: 'Sedang', lat: -4.5400, lng: 105.2900, distance_meter: 300, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.5 },

  // ========================
  // BAKAUHENI - TERBANGGI BESAR (58 Damage Reports)
  // Koordinat: Bakauheni (-5.8678, 105.7511) → Terbanggi Besar (-4.8346, 105.2833)
  // ========================
  // Km 0-1 (existing 3)
  { id: 'd019', segment_id: 'b4000000-0000-0000-0000-000000000001', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.5000, lng: 105.1000, distance_meter: 200, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.0 },
  { id: 'd020', segment_id: 'b4000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Sedang', lat: -5.5100, lng: 105.1100, distance_meter: 650, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.7 },
  { id: 'd021', segment_id: 'b4000000-0000-0000-0000-000000000003', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.5200, lng: 105.1200, distance_meter: 880, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.4 },
  // Km 3-4
  { id: 'bk001', segment_id: 'b4000000-0000-0000-0000-000000000004', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -5.7200, lng: 105.6500, distance_meter: 250.30, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.40 },
  { id: 'bk002', segment_id: 'b4000000-0000-0000-0000-000000000004', damage_type: 'Lubang', severity: 'Parah', lat: -5.7180, lng: 105.6480, distance_meter: 580.70, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.20 },
  { id: 'bk003', segment_id: 'b4000000-0000-0000-0000-000000000004', damage_type: 'Retak Buaya', severity: 'Ringan', lat: -5.7160, lng: 105.6460, distance_meter: 820.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.60 },
  // Km 4-5
  { id: 'bk004', segment_id: 'b4000000-0000-0000-0000-000000000005', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.7140, lng: 105.6440, distance_meter: 180.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.80 },
  { id: 'bk005', segment_id: 'b4000000-0000-0000-0000-000000000005', damage_type: 'Lubang', severity: 'Sedang', lat: -5.7120, lng: 105.6420, distance_meter: 450.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.30 },
  { id: 'bk006', segment_id: 'b4000000-0000-0000-0000-000000000005', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.7100, lng: 105.6400, distance_meter: 720.80, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.90 },
  // Km 5-6
  { id: 'bk007', segment_id: 'b4000000-0000-0000-0000-000000000006', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -5.7080, lng: 105.6380, distance_meter: 200.50, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.70 },
  { id: 'bk008', segment_id: 'b4000000-0000-0000-0000-000000000006', damage_type: 'Lubang', severity: 'Parah', lat: -5.7060, lng: 105.6360, distance_meter: 550.20, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.10 },
  { id: 'bk009', segment_id: 'b4000000-0000-0000-0000-000000000006', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.7040, lng: 105.6340, distance_meter: 880.60, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 85.40 },
  // Km 6-7
  { id: 'bk010', segment_id: 'b4000000-0000-0000-0000-000000000007', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.7020, lng: 105.6320, distance_meter: 150.80, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.50 },
  { id: 'bk011', segment_id: 'b4000000-0000-0000-0000-000000000007', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -5.7000, lng: 105.6300, distance_meter: 480.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.20 },
  // Km 7-8
  { id: 'bk012', segment_id: 'b4000000-0000-0000-0000-000000000008', damage_type: 'Lubang', severity: 'Ringan', lat: -5.6980, lng: 105.6280, distance_meter: 220.60, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.30 },
  { id: 'bk013', segment_id: 'b4000000-0000-0000-0000-000000000008', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.6960, lng: 105.6260, distance_meter: 560.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.80 },
  { id: 'bk014', segment_id: 'b4000000-0000-0000-0000-000000000008', damage_type: 'Retak Melintang', severity: 'Sedang', lat: -5.6940, lng: 105.6240, distance_meter: 830.50, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.10 },
  // Km 8-9
  { id: 'bk015', segment_id: 'b4000000-0000-0000-0000-000000000009', damage_type: 'Retak Memanjang', severity: 'Parah', lat: -5.6920, lng: 105.6220, distance_meter: 180.40, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.60 },
  { id: 'bk016', segment_id: 'b4000000-0000-0000-0000-000000000009', damage_type: 'Lubang', severity: 'Sedang', lat: -5.6900, lng: 105.6200, distance_meter: 520.80, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.40 },
  // Km 9-10
  { id: 'bk017', segment_id: 'b4000000-0000-0000-0000-000000000010', damage_type: 'Retak Buaya', severity: 'Ringan', lat: -5.6880, lng: 105.6180, distance_meter: 160.30, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.20 },
  { id: 'bk018', segment_id: 'b4000000-0000-0000-0000-000000000010', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.6860, lng: 105.6160, distance_meter: 490.70, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.30 },
  { id: 'bk019', segment_id: 'b4000000-0000-0000-0000-000000000010', damage_type: 'Lubang', severity: 'Sedang', lat: -5.6840, lng: 105.6140, distance_meter: 780.50, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.50 },
  // Km 10-11
  { id: 'bk020', segment_id: 'b4000000-0000-0000-0000-000000000011', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -5.6820, lng: 105.6120, distance_meter: 250.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.80 },
  { id: 'bk021', segment_id: 'b4000000-0000-0000-0000-000000000011', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.6800, lng: 105.6100, distance_meter: 620.30, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.40 },
  // Km 11-12
  { id: 'bk022', segment_id: 'b4000000-0000-0000-0000-000000000012', damage_type: 'Lubang', severity: 'Ringan', lat: -5.6780, lng: 105.6080, distance_meter: 180.80, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.50 },
  { id: 'bk023', segment_id: 'b4000000-0000-0000-0000-000000000012', damage_type: 'Retak Melintang', severity: 'Sedang', lat: -5.6760, lng: 105.6060, distance_meter: 520.40, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.70 },
  { id: 'bk024', segment_id: 'b4000000-0000-0000-0000-000000000012', damage_type: 'Retak Memanjang', severity: 'Parah', lat: -5.6740, lng: 105.6040, distance_meter: 850.60, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.20 },
  // Km 12-13
  { id: 'bk025', segment_id: 'b4000000-0000-0000-0000-000000000013', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -5.6720, lng: 105.6020, distance_meter: 200.30, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.50 },
  { id: 'bk026', segment_id: 'b4000000-0000-0000-0000-000000000013', damage_type: 'Lubang', severity: 'Parah', lat: -5.6700, lng: 105.6000, distance_meter: 580.70, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.90 },
  // Km 13-14
  { id: 'bk027', segment_id: 'b4000000-0000-0000-0000-000000000014', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.6680, lng: 105.5980, distance_meter: 150.40, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.80 },
  { id: 'bk028', segment_id: 'b4000000-0000-0000-0000-000000000014', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.6660, lng: 105.5960, distance_meter: 460.80, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.60 },
  { id: 'bk029', segment_id: 'b4000000-0000-0000-0000-000000000014', damage_type: 'Lubang', severity: 'Sedang', lat: -5.6640, lng: 105.5940, distance_meter: 780.50, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.30 },
  // Km 14-15
  { id: 'bk030', segment_id: 'b4000000-0000-0000-0000-000000000015', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.6620, lng: 105.5920, distance_meter: 220.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.10 },
  { id: 'bk031', segment_id: 'b4000000-0000-0000-0000-000000000015', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -5.6600, lng: 105.5900, distance_meter: 550.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.40 },
  // Km 15-16
  { id: 'bk032', segment_id: 'b4000000-0000-0000-0000-000000000016', damage_type: 'Lubang', severity: 'Ringan', lat: -5.6580, lng: 105.5880, distance_meter: 180.30, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 85.90 },
  { id: 'bk033', segment_id: 'b4000000-0000-0000-0000-000000000016', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.6560, lng: 105.5860, distance_meter: 510.80, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.30 },
  // Km 16-17
  { id: 'bk034', segment_id: 'b4000000-0000-0000-0000-000000000017', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -5.6540, lng: 105.5840, distance_meter: 200.50, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.80 },
  { id: 'bk035', segment_id: 'b4000000-0000-0000-0000-000000000017', damage_type: 'Retak Memanjang', severity: 'Parah', lat: -5.6520, lng: 105.5820, distance_meter: 620.30, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.50 },
  { id: 'bk036', segment_id: 'b4000000-0000-0000-0000-000000000017', damage_type: 'Lubang', severity: 'Ringan', lat: -5.6500, lng: 105.5800, distance_meter: 880.60, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.70 },
  // Km 17-18
  { id: 'bk037', segment_id: 'b4000000-0000-0000-0000-000000000018', damage_type: 'Retak Melintang', severity: 'Sedang', lat: -5.6480, lng: 105.5780, distance_meter: 150.80, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.60 },
  { id: 'bk038', segment_id: 'b4000000-0000-0000-0000-000000000018', damage_type: 'Lubang', severity: 'Parah', lat: -5.6460, lng: 105.5760, distance_meter: 490.40, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.30 },
  // Km 18-19
  { id: 'bk039', segment_id: 'b4000000-0000-0000-0000-000000000019', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.6440, lng: 105.5740, distance_meter: 220.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.40 },
  { id: 'bk040', segment_id: 'b4000000-0000-0000-0000-000000000019', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.6420, lng: 105.5720, distance_meter: 560.30, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.90 },
  { id: 'bk041', segment_id: 'b4000000-0000-0000-0000-000000000019', damage_type: 'Lubang', severity: 'Sedang', lat: -5.6400, lng: 105.5700, distance_meter: 850.80, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.20 },
  // Km 19-20
  { id: 'bk042', segment_id: 'b4000000-0000-0000-0000-000000000020', damage_type: 'Retak Melintang', severity: 'Parah', lat: -5.6380, lng: 105.5680, distance_meter: 180.40, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.70 },
  { id: 'bk043', segment_id: 'b4000000-0000-0000-0000-000000000020', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: -5.6360, lng: 105.5660, distance_meter: 520.70, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.30 },
  { id: 'bk044', segment_id: 'b4000000-0000-0000-0000-000000000020', damage_type: 'Lubang', severity: 'Ringan', lat: -5.6340, lng: 105.5640, distance_meter: 870.30, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.10 },

  // Pekanbaru - Dumai
  { id: 'd022', segment_id: 'b5000000-0000-0000-0000-000000000001', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 1.4800, lng: 101.4000, distance_meter: 300, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.5 },
  { id: 'd023', segment_id: 'b5000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Parah', lat: 1.4900, lng: 101.4100, distance_meter: 750, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.8 },
  // Cikampek
  { id: 'd024', segment_id: 'b6000000-0000-0000-0000-000000000001', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -6.4200, lng: 107.0500, distance_meter: 180, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.1 },
  { id: 'd025', segment_id: 'b6000000-0000-0000-0000-000000000002', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -6.4300, lng: 107.0600, distance_meter: 420, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.9 },
  { id: 'd026', segment_id: 'b6000000-0000-0000-0000-000000000003', damage_type: 'Lubang', severity: 'Parah', lat: -6.4400, lng: 107.0700, distance_meter: 670, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 98.2 },

  // ========================
  // MEDAN - BINJAI (45 Damage Reports)
  // Koordinat: Medan (3.5952, 98.6722) → Binjai (3.6070, 98.4856)
  // ========================
  // Km 0-1 (Area Tanjung Mulia, Medan)
  { id: 'mb001', segment_id: 'd2000000-0000-0000-0000-000000000001', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: 3.5952, lng: 98.6722, distance_meter: 120.50, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.20 },
  { id: 'mb002', segment_id: 'd2000000-0000-0000-0000-000000000001', damage_type: 'Lubang', severity: 'Sedang', lat: 3.5948, lng: 98.6715, distance_meter: 350.80, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.50 },
  { id: 'mb003', segment_id: 'd2000000-0000-0000-0000-000000000001', damage_type: 'Retak Buaya', severity: 'Parah', lat: 3.5955, lng: 98.6708, distance_meter: 680.20, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.30 },
  { id: 'mb004', segment_id: 'd2000000-0000-0000-0000-000000000001', damage_type: 'Retak Melintang', severity: 'Ringan', lat: 3.5960, lng: 98.6700, distance_meter: 890.00, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.60 },
  // Km 1-2
  { id: 'mb005', segment_id: 'd2000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Parah', lat: 3.5963, lng: 98.6685, distance_meter: 210.30, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.80 },
  { id: 'mb006', segment_id: 'd2000000-0000-0000-0000-000000000002', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: 3.5970, lng: 98.6672, distance_meter: 550.70, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.40 },
  { id: 'mb007', segment_id: 'd2000000-0000-0000-0000-000000000002', damage_type: 'Retak Buaya', severity: 'Ringan', lat: 3.5968, lng: 98.6660, distance_meter: 780.40, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 85.70 },
  // Km 2-3
  { id: 'mb008', segment_id: 'd2000000-0000-0000-0000-000000000003', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 3.5975, lng: 98.6648, distance_meter: 180.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.10 },
  { id: 'mb009', segment_id: 'd2000000-0000-0000-0000-000000000003', damage_type: 'Lubang', severity: 'Parah', lat: 3.5980, lng: 98.6635, distance_meter: 420.90, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.80 },
  { id: 'mb010', segment_id: 'd2000000-0000-0000-0000-000000000003', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: 3.5983, lng: 98.6625, distance_meter: 650.30, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.30 },
  { id: 'mb011', segment_id: 'd2000000-0000-0000-0000-000000000003', damage_type: 'Retak Buaya', severity: 'Sedang', lat: 3.5985, lng: 98.6618, distance_meter: 870.50, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.60 },
  // Km 3-4
  { id: 'mb012', segment_id: 'd2000000-0000-0000-0000-000000000004', damage_type: 'Lubang', severity: 'Ringan', lat: 3.5990, lng: 98.6605, distance_meter: 150.20, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.40 },
  { id: 'mb013', segment_id: 'd2000000-0000-0000-0000-000000000004', damage_type: 'Retak Melintang', severity: 'Parah', lat: 3.5988, lng: 98.6590, distance_meter: 480.80, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.20 },
  { id: 'mb014', segment_id: 'd2000000-0000-0000-0000-000000000004', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: 3.5992, lng: 98.6580, distance_meter: 720.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.90 },
  // Km 4-5
  { id: 'mb015', segment_id: 'd2000000-0000-0000-0000-000000000005', damage_type: 'Retak Buaya', severity: 'Parah', lat: 3.5995, lng: 98.6565, distance_meter: 300.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.50 },
  { id: 'mb016', segment_id: 'd2000000-0000-0000-0000-000000000005', damage_type: 'Lubang', severity: 'Sedang', lat: 3.5998, lng: 98.6550, distance_meter: 620.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.80 },
  { id: 'mb017', segment_id: 'd2000000-0000-0000-0000-000000000005', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: 3.6000, lng: 98.6540, distance_meter: 850.70, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.40 },
  // Km 5-6
  { id: 'mb018', segment_id: 'd2000000-0000-0000-0000-000000000006', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 3.6003, lng: 98.6525, distance_meter: 160.90, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.20 },
  { id: 'mb019', segment_id: 'd2000000-0000-0000-0000-000000000006', damage_type: 'Lubang', severity: 'Parah', lat: 3.6005, lng: 98.6510, distance_meter: 440.50, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.60 },
  { id: 'mb020', segment_id: 'd2000000-0000-0000-0000-000000000006', damage_type: 'Retak Buaya', severity: 'Ringan', lat: 3.6008, lng: 98.6498, distance_meter: 780.20, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.10 },
  // Km 6-7
  { id: 'mb021', segment_id: 'd2000000-0000-0000-0000-000000000007', damage_type: 'Retak Memanjang', severity: 'Parah', lat: 3.6010, lng: 98.6482, distance_meter: 250.80, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.70 },
  { id: 'mb022', segment_id: 'd2000000-0000-0000-0000-000000000007', damage_type: 'Lubang', severity: 'Sedang', lat: 3.6012, lng: 98.6468, distance_meter: 560.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.30 },
  // Km 7-8
  { id: 'mb023', segment_id: 'd2000000-0000-0000-0000-000000000008', damage_type: 'Retak Buaya', severity: 'Ringan', lat: 3.6015, lng: 98.6452, distance_meter: 180.60, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.90 },
  { id: 'mb024', segment_id: 'd2000000-0000-0000-0000-000000000008', damage_type: 'Retak Melintang', severity: 'Parah', lat: 3.6018, lng: 98.6438, distance_meter: 500.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.10 },
  { id: 'mb025', segment_id: 'd2000000-0000-0000-0000-000000000008', damage_type: 'Lubang', severity: 'Sedang', lat: 3.6020, lng: 98.6425, distance_meter: 780.90, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.80 },
  // Km 8-9
  { id: 'mb026', segment_id: 'd2000000-0000-0000-0000-000000000009', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: 3.6022, lng: 98.6410, distance_meter: 220.40, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.50 },
  { id: 'mb027', segment_id: 'd2000000-0000-0000-0000-000000000009', damage_type: 'Retak Buaya', severity: 'Parah', lat: 3.6025, lng: 98.6395, distance_meter: 650.70, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.80 },
  // Km 9-10
  { id: 'mb028', segment_id: 'd2000000-0000-0000-0000-000000000010', damage_type: 'Lubang', severity: 'Ringan', lat: 3.6028, lng: 98.6380, distance_meter: 130.50, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.20 },
  { id: 'mb029', segment_id: 'd2000000-0000-0000-0000-000000000010', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 3.6030, lng: 98.6365, distance_meter: 480.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.40 },
  { id: 'mb030', segment_id: 'd2000000-0000-0000-0000-000000000010', damage_type: 'Retak Memanjang', severity: 'Parah', lat: 3.6032, lng: 98.6350, distance_meter: 780.80, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.90 },
  // Km 10-11
  { id: 'mb031', segment_id: 'd2000000-0000-0000-0000-000000000011', damage_type: 'Retak Buaya', severity: 'Sedang', lat: 3.6035, lng: 98.6335, distance_meter: 200.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 89.70 },
  { id: 'mb032', segment_id: 'd2000000-0000-0000-0000-000000000011', damage_type: 'Lubang', severity: 'Parah', lat: 3.6038, lng: 98.6320, distance_meter: 550.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.30 },
  // Km 11-12
  { id: 'mb033', segment_id: 'd2000000-0000-0000-0000-000000000012', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: 3.6040, lng: 98.6305, distance_meter: 170.80, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 85.50 },
  { id: 'mb034', segment_id: 'd2000000-0000-0000-0000-000000000012', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 3.6042, lng: 98.6290, distance_meter: 420.50, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.60 },
  { id: 'mb035', segment_id: 'd2000000-0000-0000-0000-000000000012', damage_type: 'Lubang', severity: 'Parah', lat: 3.6045, lng: 98.6278, distance_meter: 720.30, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 97.10 },
  // Km 12-13
  { id: 'mb036', segment_id: 'd2000000-0000-0000-0000-000000000013', damage_type: 'Retak Buaya', severity: 'Parah', lat: 3.6048, lng: 98.6262, distance_meter: 280.60, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.80 },
  { id: 'mb037', segment_id: 'd2000000-0000-0000-0000-000000000013', damage_type: 'Retak Memanjang', severity: 'Sedang', lat: 3.6050, lng: 98.6248, distance_meter: 590.40, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.20 },
  // Km 13-14
  { id: 'mb038', segment_id: 'd2000000-0000-0000-0000-000000000014', damage_type: 'Lubang', severity: 'Ringan', lat: 3.6052, lng: 98.6232, distance_meter: 160.70, quarter_period: '2023-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.40 },
  { id: 'mb039', segment_id: 'd2000000-0000-0000-0000-000000000014', damage_type: 'Retak Melintang', severity: 'Parah', lat: 3.6055, lng: 98.6218, distance_meter: 480.30, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.50 },
  { id: 'mb040', segment_id: 'd2000000-0000-0000-0000-000000000014', damage_type: 'Retak Buaya', severity: 'Sedang', lat: 3.6058, lng: 98.6205, distance_meter: 750.80, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.90 },
  // Km 14-15
  { id: 'mb041', segment_id: 'd2000000-0000-0000-0000-000000000015', damage_type: 'Retak Memanjang', severity: 'Parah', lat: 3.6060, lng: 98.6190, distance_meter: 220.50, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.30 },
  { id: 'mb042', segment_id: 'd2000000-0000-0000-0000-000000000015', damage_type: 'Lubang', severity: 'Sedang', lat: 3.6062, lng: 98.6175, distance_meter: 560.80, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 92.70 },
  // Km 15-16 (Area Binjai)
  { id: 'mb043', segment_id: 'd2000000-0000-0000-0000-000000000016', damage_type: 'Retak Buaya', severity: 'Ringan', lat: 3.6065, lng: 98.6160, distance_meter: 180.30, quarter_period: '2023-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 86.80 },
  { id: 'mb044', segment_id: 'd2000000-0000-0000-0000-000000000016', damage_type: 'Retak Melintang', severity: 'Parah', lat: 3.6068, lng: 98.6145, distance_meter: 520.60, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 94.90 },
  { id: 'mb045', segment_id: 'd2000000-0000-0000-0000-000000000016', damage_type: 'Lubang', severity: 'Sedang', lat: 3.6070, lng: 98.6130, distance_meter: 850.40, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.10 },
];

/* Toll‐road polyline coords for the map overlay (simplified) */
export const TOLL_POLYLINES = {
  'a1000000-0000-0000-0000-000000000001': [
    [106.842, -6.283], [106.845, -6.285], [106.848, -6.288], [106.850, -6.290], [106.853, -6.292]
  ],
  'a1000000-0000-0000-0000-000000000002': [
    [106.857, -6.303], [106.860, -6.306], [106.862, -6.308]
  ],
  'a1000000-0000-0000-0000-000000000003': [
    [107.048, -6.418], [107.058, -6.428], [107.068, -6.438]
  ],
  'a1000000-0000-0000-0000-000000000004': [
    [105.258, -4.508], [105.268, -4.518], [105.278, -4.528], [105.288, -4.538]
  ],
  // Bakauheni - Terbanggi Besar (Extended polyline)
  'a1000000-0000-0000-0000-000000000005': [
    [105.751, -5.868], [105.745, -5.860], [105.735, -5.840],
    [105.720, -5.820], [105.710, -5.800], [105.700, -5.780],
    [105.680, -5.760], [105.665, -5.740], [105.650, -5.720],
    [105.640, -5.700], [105.630, -5.680], [105.620, -5.660],
    [105.610, -5.640], [105.600, -5.620], [105.590, -5.600],
    [105.580, -5.580], [105.570, -5.560], [105.565, -5.540],
    [105.560, -5.520], [105.555, -5.500]
  ],
  'a1000000-0000-0000-0000-000000000006': [
    [101.398, 1.478], [101.408, 1.488]
  ],
  // JORR-S (TB Simatupang) Lebak Bulus -> Ps Rebo
  'c1000000-0000-0000-0000-000000000001': [
    [106.7750, -6.2915],
    [106.8020, -6.2935],
    [106.8290, -6.2965],
    [106.8560, -6.2995],
    [106.8830, -6.3025]
  ],
  // === MEDAN - BINJAI (Tol arah barat dari Medan ke Binjai) ===
  'd1000000-0000-0000-0000-000000000001': [
    [98.672, 3.595], [98.668, 3.596], [98.663, 3.597],
    [98.658, 3.598], [98.653, 3.599], [98.648, 3.600],
    [98.643, 3.601], [98.638, 3.601], [98.633, 3.602],
    [98.628, 3.603], [98.623, 3.603], [98.618, 3.604],
    [98.613, 3.605], [98.608, 3.606], [98.603, 3.606],
    [98.598, 3.607], [98.593, 3.607]
  ],
};

/* Mock Toll Assets Data — For local/mock display */
export const TOLL_ASSETS = [
  // === MEDAN - BINJAI Assets (25 items) ===
  { id: 'ma001', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.5952, lng: 98.6720, condition: 'Baik', notes: 'Lampu PJU 150W LED, tiang 9m', ai_confidence: 95.00 },
  { id: 'ma002', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.5970, lng: 98.6670, condition: 'Rusak Ringan', notes: 'Lampu redup, perlu penggantian ballast', ai_confidence: 88.50 },
  { id: 'ma003', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.5990, lng: 98.6600, condition: 'Baik', notes: 'Lampu PJU 100W LED baru', ai_confidence: 93.20 },
  { id: 'ma004', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.6010, lng: 98.6480, condition: 'Rusak Berat', notes: 'Tiang miring 15 derajat, lampu mati total', ai_confidence: 97.10 },
  { id: 'ma005', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.6035, lng: 98.6330, condition: 'Baik', notes: 'Lampu solar cell 80W', ai_confidence: 91.40 },
  { id: 'ma006', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Lampu Jalan', lat: 3.6060, lng: 98.6185, condition: 'Rusak Ringan', notes: 'Sensor otomatis tidak berfungsi', ai_confidence: 86.30 },
  { id: 'ma007', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Guardrail', lat: 3.5955, lng: 98.6710, condition: 'Baik', notes: 'Guardrail W-beam galvanis, L=48m', ai_confidence: 94.80 },
  { id: 'ma008', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Guardrail', lat: 3.5980, lng: 98.6630, condition: 'Rusak Berat', notes: 'Guardrail penyok akibat kecelakaan, 8m perlu ganti', ai_confidence: 96.50 },
  { id: 'ma009', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Guardrail', lat: 3.6005, lng: 98.6515, condition: 'Rusak Ringan', notes: 'Baut longgar pada 3 titik sambungan', ai_confidence: 89.20 },
  { id: 'ma010', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Guardrail', lat: 3.6030, lng: 98.6360, condition: 'Baik', notes: 'Guardrail besi H-beam, kondisi baik', ai_confidence: 92.70 },
  { id: 'ma011', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Guardrail', lat: 3.6055, lng: 98.6210, condition: 'Rusak Ringan', notes: 'Karat pada permukaan, perlu pengecatan ulang', ai_confidence: 87.90 },
  { id: 'ma012', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Plang/Rambu', lat: 3.5950, lng: 98.6725, condition: 'Baik', notes: 'Rambu batas kecepatan 80 km/h', ai_confidence: 93.60 },
  { id: 'ma013', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Plang/Rambu', lat: 3.5985, lng: 98.6620, condition: 'Rusak Ringan', notes: 'Stiker reflektif pudar', ai_confidence: 88.40 },
  { id: 'ma014', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Plang/Rambu', lat: 3.6020, lng: 98.6415, condition: 'Baik', notes: 'Rambu informasi jarak ke Binjai', ai_confidence: 95.10 },
  { id: 'ma015', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Plang/Rambu', lat: 3.6050, lng: 98.6245, condition: 'Rusak Berat', notes: 'Rambu roboh akibat angin kencang', ai_confidence: 96.80 },
  { id: 'ma016', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'CCTV', lat: 3.5952, lng: 98.6722, condition: 'Baik', notes: 'CCTV PTZ 360°, resolusi 4K', ai_confidence: 94.50 },
  { id: 'ma017', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'CCTV', lat: 3.5995, lng: 98.6555, condition: 'Rusak Ringan', notes: 'CCTV fixed, gambar blur saat malam', ai_confidence: 90.20 },
  { id: 'ma018', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'CCTV', lat: 3.6025, lng: 98.6385, condition: 'Baik', notes: 'CCTV PTZ, tersambung ke TMC Medan', ai_confidence: 92.80 },
  { id: 'ma019', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'CCTV', lat: 3.6065, lng: 98.6155, condition: 'Rusak Berat', notes: 'CCTV mati total, kabel putus', ai_confidence: 97.30 },
  { id: 'ma020', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Gantry Tol', lat: 3.5952, lng: 98.6726, condition: 'Baik', notes: 'Gantry masuk Tol Medan', ai_confidence: 95.50 },
  { id: 'ma021', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Gantry Tol', lat: 3.6015, lng: 98.6450, condition: 'Baik', notes: 'Gantry tengah (multi-lane free flow)', ai_confidence: 93.80 },
  { id: 'ma022', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Gantry Tol', lat: 3.6070, lng: 98.6128, condition: 'Rusak Ringan', notes: 'Gantry keluar, sensor RFID error', ai_confidence: 89.60 },
  { id: 'ma023', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Pembatas Jalan', lat: 3.5965, lng: 98.6690, condition: 'Baik', notes: 'Median barrier beton New Jersey, L=100m', ai_confidence: 91.30 },
  { id: 'ma024', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Pembatas Jalan', lat: 3.6000, lng: 98.6545, condition: 'Rusak Ringan', notes: 'Delineator post hilang 5 unit', ai_confidence: 87.80 },
  { id: 'ma025', toll_road_id: 'd1000000-0000-0000-0000-000000000001', asset_type: 'Pembatas Jalan', lat: 3.6040, lng: 98.6300, condition: 'Rusak Berat', notes: 'Median barrier retak akibat tumbukan truk', ai_confidence: 96.10 },

  // === BAKAUHENI - TERBANGGI BESAR Assets (30 items) ===
  { id: 'ba001', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.8600, lng: 105.7450, condition: 'Baik', notes: 'Lampu PJU 200W LED, tiang 12m', ai_confidence: 94.20 },
  { id: 'ba002', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.7800, lng: 105.6800, condition: 'Rusak Ringan', notes: 'Lampu berkedip intermiten', ai_confidence: 87.60 },
  { id: 'ba003', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.7200, lng: 105.6500, condition: 'Baik', notes: 'Lampu solar cell 120W', ai_confidence: 92.80 },
  { id: 'ba004', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.6800, lng: 105.6100, condition: 'Rusak Berat', notes: 'Tiang patah akibat pohon tumbang', ai_confidence: 96.40 },
  { id: 'ba005', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.6400, lng: 105.5700, condition: 'Baik', notes: 'Lampu PJU 150W LED baru 2024', ai_confidence: 90.50 },
  { id: 'ba006', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.8200, lng: 105.7200, condition: 'Rusak Ringan', notes: 'Sensor cahaya senja rusak', ai_confidence: 88.30 },
  { id: 'ba007', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lampu Jalan', lat: -5.7500, lng: 105.6650, condition: 'Baik', notes: 'Lampu PJU dual-arm 100W', ai_confidence: 93.70 },
  { id: 'ba008', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Guardrail', lat: -5.8500, lng: 105.7400, condition: 'Baik', notes: 'Guardrail W-beam galvanis, L=100m', ai_confidence: 95.10 },
  { id: 'ba009', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Guardrail', lat: -5.7600, lng: 105.6700, condition: 'Rusak Berat', notes: 'Guardrail rusak di tikungan, kecelakaan truk', ai_confidence: 97.20 },
  { id: 'ba010', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Guardrail', lat: -5.7000, lng: 105.6300, condition: 'Rusak Ringan', notes: 'Cat terkelupas, baut longgar', ai_confidence: 89.80 },
  { id: 'ba011', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Guardrail', lat: -5.6600, lng: 105.5900, condition: 'Baik', notes: 'Guardrail baru 2024-Q2', ai_confidence: 93.40 },
  { id: 'ba012', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Guardrail', lat: -5.8000, lng: 105.7000, condition: 'Rusak Ringan', notes: 'Guardrail miring 5°', ai_confidence: 86.90 },
  { id: 'ba013', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Plang/Rambu', lat: -5.8650, lng: 105.7480, condition: 'Baik', notes: 'Rambu entrance Bakauheni', ai_confidence: 94.60 },
  { id: 'ba014', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Plang/Rambu', lat: -5.7900, lng: 105.6900, condition: 'Rusak Ringan', notes: 'Reflektif rusak', ai_confidence: 88.20 },
  { id: 'ba015', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Plang/Rambu', lat: -5.7300, lng: 105.6400, condition: 'Rusak Berat', notes: 'Rambu rest area jatuh', ai_confidence: 96.80 },
  { id: 'ba016', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Plang/Rambu', lat: -5.6700, lng: 105.6000, condition: 'Baik', notes: 'Rambu batas kecepatan 100 km/h', ai_confidence: 91.50 },
  { id: 'ba017', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Plang/Rambu', lat: -5.8300, lng: 105.7100, condition: 'Baik', notes: 'Gantry sign overhead', ai_confidence: 93.10 },
  { id: 'ba018', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'CCTV', lat: -5.8670, lng: 105.7505, condition: 'Baik', notes: 'CCTV PTZ connected TMC Lampung', ai_confidence: 95.30 },
  { id: 'ba019', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'CCTV', lat: -5.7700, lng: 105.6750, condition: 'Rusak Ringan', notes: 'CCTV fixed, lensa kotor', ai_confidence: 89.10 },
  { id: 'ba020', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'CCTV', lat: -5.7100, lng: 105.6200, condition: 'Baik', notes: 'CCTV speed detection, dual cam', ai_confidence: 92.40 },
  { id: 'ba021', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'CCTV', lat: -5.6500, lng: 105.5800, condition: 'Rusak Berat', notes: 'Rusak akibat petir', ai_confidence: 97.50 },
  { id: 'ba022', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'CCTV', lat: -5.8100, lng: 105.7050, condition: 'Baik', notes: 'CCTV PTZ backup, 2K', ai_confidence: 91.80 },
  { id: 'ba023', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Gantry Tol', lat: -5.8678, lng: 105.7511, condition: 'Baik', notes: 'Gantry masuk Bakauheni, 6 lane', ai_confidence: 94.90 },
  { id: 'ba024', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Gantry Tol', lat: -5.7400, lng: 105.6550, condition: 'Rusak Ringan', notes: 'Sensor DSRC error', ai_confidence: 88.60 },
  { id: 'ba025', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Gantry Tol', lat: -5.6350, lng: 105.5650, condition: 'Baik', notes: 'Gantry exit Terbanggi Besar', ai_confidence: 93.20 },
  { id: 'ba026', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Pembatas Jalan', lat: -5.8400, lng: 105.7350, condition: 'Baik', notes: 'Median barrier beton precast, L=200m', ai_confidence: 92.60 },
  { id: 'ba027', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Pembatas Jalan', lat: -5.7400, lng: 105.6600, condition: 'Rusak Ringan', notes: 'Delineator post 12 hilang', ai_confidence: 87.40 },
  { id: 'ba028', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Pembatas Jalan', lat: -5.6900, lng: 105.6150, condition: 'Rusak Berat', notes: 'Median barrier bergeser 30cm', ai_confidence: 96.70 },
  { id: 'ba029', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Pembatas Jalan', lat: -5.6300, lng: 105.5650, condition: 'Baik', notes: 'Rumble strip & median baik', ai_confidence: 91.90 },
  { id: 'ba030', toll_road_id: 'a1000000-0000-0000-0000-000000000005', asset_type: 'Lainnya', lat: -5.7500, lng: 105.6650, condition: 'Baik', notes: 'Rest Area KM 72 — fasilitas lengkap', ai_confidence: 90.30 },
];
