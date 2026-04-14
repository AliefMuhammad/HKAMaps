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
  // Bakauheni - Terbanggi
  { id: 'b4000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 0-1' },
  { id: 'b4000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 1-2' },
  { id: 'b4000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000005', segment_name: 'Km 2-3' },
  // Pekanbaru - Dumai
  { id: 'b5000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000006', segment_name: 'Km 0-1' },
  { id: 'b5000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000006', segment_name: 'Km 1-2' },
  // Cikampek
  { id: 'b6000000-0000-0000-0000-000000000001', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 0-1' },
  { id: 'b6000000-0000-0000-0000-000000000002', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 1-2' },
  { id: 'b6000000-0000-0000-0000-000000000003', toll_road_id: 'a1000000-0000-0000-0000-000000000003', segment_name: 'Km 2-3' },
];

export const DAMAGE_REPORTS = [
  // JORR - Km 0-1
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
  // Bakauheni - Terbanggi
  { id: 'd019', segment_id: 'b4000000-0000-0000-0000-000000000001', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -5.5000, lng: 105.1000, distance_meter: 200, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 88.0 },
  { id: 'd020', segment_id: 'b4000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Sedang', lat: -5.5100, lng: 105.1100, distance_meter: 650, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 93.7 },
  { id: 'd021', segment_id: 'b4000000-0000-0000-0000-000000000003', damage_type: 'Retak Buaya', severity: 'Parah', lat: -5.5200, lng: 105.1200, distance_meter: 880, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 95.4 },
  // Pekanbaru - Dumai
  { id: 'd022', segment_id: 'b5000000-0000-0000-0000-000000000001', damage_type: 'Retak Melintang', severity: 'Sedang', lat: 1.4800, lng: 101.4000, distance_meter: 300, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 91.5 },
  { id: 'd023', segment_id: 'b5000000-0000-0000-0000-000000000002', damage_type: 'Lubang', severity: 'Parah', lat: 1.4900, lng: 101.4100, distance_meter: 750, quarter_period: '2024-Q2', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 96.8 },
  // Cikampek
  { id: 'd024', segment_id: 'b6000000-0000-0000-0000-000000000001', damage_type: 'Retak Buaya', severity: 'Sedang', lat: -6.4200, lng: 107.0500, distance_meter: 180, quarter_period: '2024-Q1', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 90.1 },
  { id: 'd025', segment_id: 'b6000000-0000-0000-0000-000000000002', damage_type: 'Retak Memanjang', severity: 'Ringan', lat: -6.4300, lng: 107.0600, distance_meter: 420, quarter_period: '2024-Q3', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 87.9 },
  { id: 'd026', segment_id: 'b6000000-0000-0000-0000-000000000003', damage_type: 'Lubang', severity: 'Parah', lat: -6.4400, lng: 107.0700, distance_meter: 670, quarter_period: '2024-Q4', image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', ai_confidence: 98.2 },
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
  'a1000000-0000-0000-0000-000000000005': [
    [105.098, -5.498], [105.108, -5.508], [105.118, -5.518]
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
};
