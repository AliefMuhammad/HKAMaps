-- =============================================
-- SEED DATA: MEDAN - BINJAI (MedBin) & BAKAUHENI - TERBANGGI BESAR (BakTer)
-- Data Lengkap: Toll Roads, Segments, Damage Reports, Toll Assets
-- =============================================
-- INSTRUKSI: Jalankan di Supabase SQL Editor SETELAH schema utama & add_scanner_tables.sql

-- =============================================
-- 1. TOLL ROAD: MEDAN - BINJAI
-- =============================================
INSERT INTO toll_roads (id, name, region, total_km, condition_good_percentage)
VALUES ('d1000000-0000-0000-0000-000000000001', 'Tol Medan - Binjai', 'Trans Sumatera', 16.80, 87.30)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. ROAD SEGMENTS: MEDAN - BINJAI (16 Segmen = Km 0-1 s/d Km 15-16)
-- =============================================
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Km 0-1'),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'Km 1-2'),
  ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'Km 2-3'),
  ('d2000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'Km 3-4'),
  ('d2000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'Km 4-5'),
  ('d2000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000001', 'Km 5-6'),
  ('d2000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000001', 'Km 6-7'),
  ('d2000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000001', 'Km 7-8'),
  ('d2000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000001', 'Km 8-9'),
  ('d2000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000001', 'Km 9-10'),
  ('d2000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000001', 'Km 10-11'),
  ('d2000000-0000-0000-0000-000000000012', 'd1000000-0000-0000-0000-000000000001', 'Km 11-12'),
  ('d2000000-0000-0000-0000-000000000013', 'd1000000-0000-0000-0000-000000000001', 'Km 12-13'),
  ('d2000000-0000-0000-0000-000000000014', 'd1000000-0000-0000-0000-000000000001', 'Km 13-14'),
  ('d2000000-0000-0000-0000-000000000015', 'd1000000-0000-0000-0000-000000000001', 'Km 14-15'),
  ('d2000000-0000-0000-0000-000000000016', 'd1000000-0000-0000-0000-000000000001', 'Km 15-16')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. DAMAGE REPORTS: MEDAN - BINJAI (60 Laporan Kerusakan)
-- Koordinat realistis: Medan (3.5952, 98.6722) → Binjai (3.6004, 98.4856)
-- =============================================
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  -- Km 0-1 (Area Tanjung Mulia, Medan)
  ('d2000000-0000-0000-0000-000000000001', 'Retak Memanjang', 'Ringan', 3.5952, 98.6722, 120.50, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.20),
  ('d2000000-0000-0000-0000-000000000001', 'Lubang', 'Sedang', 3.5948, 98.6715, 350.80, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.50),
  ('d2000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Parah', 3.5955, 98.6708, 680.20, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.30),
  ('d2000000-0000-0000-0000-000000000001', 'Retak Melintang', 'Ringan', 3.5960, 98.6700, 890.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.60),
  -- Km 1-2
  ('d2000000-0000-0000-0000-000000000002', 'Lubang', 'Parah', 3.5963, 98.6685, 210.30, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.80),
  ('d2000000-0000-0000-0000-000000000002', 'Retak Memanjang', 'Sedang', 3.5970, 98.6672, 550.70, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.40),
  ('d2000000-0000-0000-0000-000000000002', 'Retak Buaya', 'Ringan', 3.5968, 98.6660, 780.40, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.70),
  -- Km 2-3
  ('d2000000-0000-0000-0000-000000000003', 'Retak Melintang', 'Sedang', 3.5975, 98.6648, 180.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.10),
  ('d2000000-0000-0000-0000-000000000003', 'Lubang', 'Parah', 3.5980, 98.6635, 420.90, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.80),
  ('d2000000-0000-0000-0000-000000000003', 'Retak Memanjang', 'Ringan', 3.5983, 98.6625, 650.30, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.30),
  ('d2000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Sedang', 3.5985, 98.6618, 870.50, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.60),
  -- Km 3-4
  ('d2000000-0000-0000-0000-000000000004', 'Lubang', 'Ringan', 3.5990, 98.6605, 150.20, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.40),
  ('d2000000-0000-0000-0000-000000000004', 'Retak Melintang', 'Parah', 3.5988, 98.6590, 480.80, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.20),
  ('d2000000-0000-0000-0000-000000000004', 'Retak Memanjang', 'Sedang', 3.5992, 98.6580, 720.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.90),
  -- Km 4-5
  ('d2000000-0000-0000-0000-000000000005', 'Retak Buaya', 'Parah', 3.5995, 98.6565, 300.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.50),
  ('d2000000-0000-0000-0000-000000000005', 'Lubang', 'Sedang', 3.5998, 98.6550, 620.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.80),
  ('d2000000-0000-0000-0000-000000000005', 'Retak Memanjang', 'Ringan', 3.6000, 98.6540, 850.70, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.40),
  -- Km 5-6
  ('d2000000-0000-0000-0000-000000000006', 'Retak Melintang', 'Sedang', 3.6003, 98.6525, 160.90, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.20),
  ('d2000000-0000-0000-0000-000000000006', 'Lubang', 'Parah', 3.6005, 98.6510, 440.50, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.60),
  ('d2000000-0000-0000-0000-000000000006', 'Retak Buaya', 'Ringan', 3.6008, 98.6498, 780.20, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.10),
  -- Km 6-7
  ('d2000000-0000-0000-0000-000000000007', 'Retak Memanjang', 'Parah', 3.6010, 98.6482, 250.80, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.70),
  ('d2000000-0000-0000-0000-000000000007', 'Lubang', 'Sedang', 3.6012, 98.6468, 560.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.30),
  -- Km 7-8
  ('d2000000-0000-0000-0000-000000000008', 'Retak Buaya', 'Ringan', 3.6015, 98.6452, 180.60, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.90),
  ('d2000000-0000-0000-0000-000000000008', 'Retak Melintang', 'Parah', 3.6018, 98.6438, 500.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.10),
  ('d2000000-0000-0000-0000-000000000008', 'Lubang', 'Sedang', 3.6020, 98.6425, 780.90, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.80),
  -- Km 8-9
  ('d2000000-0000-0000-0000-000000000009', 'Retak Memanjang', 'Sedang', 3.6022, 98.6410, 220.40, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.50),
  ('d2000000-0000-0000-0000-000000000009', 'Retak Buaya', 'Parah', 3.6025, 98.6395, 650.70, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.80),
  -- Km 9-10
  ('d2000000-0000-0000-0000-000000000010', 'Lubang', 'Ringan', 3.6028, 98.6380, 130.50, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.20),
  ('d2000000-0000-0000-0000-000000000010', 'Retak Melintang', 'Sedang', 3.6030, 98.6365, 480.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.40),
  ('d2000000-0000-0000-0000-000000000010', 'Retak Memanjang', 'Parah', 3.6032, 98.6350, 780.80, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.90),
  -- Km 10-11
  ('d2000000-0000-0000-0000-000000000011', 'Retak Buaya', 'Sedang', 3.6035, 98.6335, 200.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.70),
  ('d2000000-0000-0000-0000-000000000011', 'Lubang', 'Parah', 3.6038, 98.6320, 550.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.30),
  -- Km 11-12
  ('d2000000-0000-0000-0000-000000000012', 'Retak Memanjang', 'Ringan', 3.6040, 98.6305, 170.80, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.50),
  ('d2000000-0000-0000-0000-000000000012', 'Retak Melintang', 'Sedang', 3.6042, 98.6290, 420.50, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.60),
  ('d2000000-0000-0000-0000-000000000012', 'Lubang', 'Parah', 3.6045, 98.6278, 720.30, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.10),
  -- Km 12-13
  ('d2000000-0000-0000-0000-000000000013', 'Retak Buaya', 'Parah', 3.6048, 98.6262, 280.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.80),
  ('d2000000-0000-0000-0000-000000000013', 'Retak Memanjang', 'Sedang', 3.6050, 98.6248, 590.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.20),
  -- Km 13-14
  ('d2000000-0000-0000-0000-000000000014', 'Lubang', 'Ringan', 3.6052, 98.6232, 160.70, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.40),
  ('d2000000-0000-0000-0000-000000000014', 'Retak Melintang', 'Parah', 3.6055, 98.6218, 480.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.50),
  ('d2000000-0000-0000-0000-000000000014', 'Retak Buaya', 'Sedang', 3.6058, 98.6205, 750.80, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.90),
  -- Km 14-15
  ('d2000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Parah', 3.6060, 98.6190, 220.50, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.30),
  ('d2000000-0000-0000-0000-000000000015', 'Lubang', 'Sedang', 3.6062, 98.6175, 560.80, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.70),
  -- Km 15-16 (Area Binjai)
  ('d2000000-0000-0000-0000-000000000016', 'Retak Buaya', 'Ringan', 3.6065, 98.6160, 180.30, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.80),
  ('d2000000-0000-0000-0000-000000000016', 'Retak Melintang', 'Parah', 3.6068, 98.6145, 520.60, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.90),
  ('d2000000-0000-0000-0000-000000000016', 'Lubang', 'Sedang', 3.6070, 98.6130, 850.40, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.10);

-- =============================================
-- 4. TOLL ASSETS: MEDAN - BINJAI (25 Aset)
-- =============================================
INSERT INTO toll_assets (toll_road_id, asset_type, lat, lng, condition, image_url, ai_confidence, notes) VALUES
  -- Lampu Jalan
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.5952, 98.6720, 'Baik', NULL, 95.00, 'Lampu PJU 150W LED, tiang 9m'),
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.5970, 98.6670, 'Rusak Ringan', NULL, 88.50, 'Lampu redup, perlu penggantian ballast'),
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.5990, 98.6600, 'Baik', NULL, 93.20, 'Lampu PJU 100W LED baru'),
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.6010, 98.6480, 'Rusak Berat', NULL, 97.10, 'Tiang miring 15 derajat, lampu mati total'),
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.6035, 98.6330, 'Baik', NULL, 91.40, 'Lampu solar cell 80W'),
  ('d1000000-0000-0000-0000-000000000001', 'Lampu Jalan', 3.6060, 98.6185, 'Rusak Ringan', NULL, 86.30, 'Sensor otomatis tidak berfungsi'),
  -- Guardrail
  ('d1000000-0000-0000-0000-000000000001', 'Guardrail', 3.5955, 98.6710, 'Baik', NULL, 94.80, 'Guardrail W-beam galvanis, L=48m'),
  ('d1000000-0000-0000-0000-000000000001', 'Guardrail', 3.5980, 98.6630, 'Rusak Berat', NULL, 96.50, 'Guardrail penyok akibat kecelakaan, 8m perlu ganti'),
  ('d1000000-0000-0000-0000-000000000001', 'Guardrail', 3.6005, 98.6515, 'Rusak Ringan', NULL, 89.20, 'Baut longgar pada 3 titik sambungan'),
  ('d1000000-0000-0000-0000-000000000001', 'Guardrail', 3.6030, 98.6360, 'Baik', NULL, 92.70, 'Guardrail besi H-beam, kondisi baik'),
  ('d1000000-0000-0000-0000-000000000001', 'Guardrail', 3.6055, 98.6210, 'Rusak Ringan', NULL, 87.90, 'Karat pada permukaan, perlu pengecatan ulang'),
  -- Plang/Rambu
  ('d1000000-0000-0000-0000-000000000001', 'Plang/Rambu', 3.5950, 98.6725, 'Baik', NULL, 93.60, 'Rambu batas kecepatan 80 km/h'),
  ('d1000000-0000-0000-0000-000000000001', 'Plang/Rambu', 3.5985, 98.6620, 'Rusak Ringan', NULL, 88.40, 'Stiker reflektif pudar, perlu penggantian'),
  ('d1000000-0000-0000-0000-000000000001', 'Plang/Rambu', 3.6020, 98.6415, 'Baik', NULL, 95.10, 'Rambu informasi jarak ke Binjai'),
  ('d1000000-0000-0000-0000-000000000001', 'Plang/Rambu', 3.6050, 98.6245, 'Rusak Berat', NULL, 96.80, 'Rambu roboh akibat angin kencang'),
  -- CCTV
  ('d1000000-0000-0000-0000-000000000001', 'CCTV', 3.5952, 98.6722, 'Baik', NULL, 94.50, 'CCTV PTZ 360°, resolusi 4K'),
  ('d1000000-0000-0000-0000-000000000001', 'CCTV', 3.5995, 98.6555, 'Rusak Ringan', NULL, 90.20, 'CCTV fixed, gambar blur saat malam'),
  ('d1000000-0000-0000-0000-000000000001', 'CCTV', 3.6025, 98.6385, 'Baik', NULL, 92.80, 'CCTV PTZ, tersambung ke TMC Medan'),
  ('d1000000-0000-0000-0000-000000000001', 'CCTV', 3.6065, 98.6155, 'Rusak Berat', NULL, 97.30, 'CCTV mati total, kabel putus'),
  -- Gantry Tol
  ('d1000000-0000-0000-0000-000000000001', 'Gantry Tol', 3.5952, 98.6726, 'Baik', NULL, 95.50, 'Gantry masuk Tol Medan - sisi Tanjung Mulia'),
  ('d1000000-0000-0000-0000-000000000001', 'Gantry Tol', 3.6015, 98.6450, 'Baik', NULL, 93.80, 'Gantry tengah (multi-lane free flow)'),
  ('d1000000-0000-0000-0000-000000000001', 'Gantry Tol', 3.6070, 98.6128, 'Rusak Ringan', NULL, 89.60, 'Gantry keluar Tol Binjai, sensor RFID error intermiten'),
  -- Pembatas Jalan
  ('d1000000-0000-0000-0000-000000000001', 'Pembatas Jalan', 3.5965, 98.6690, 'Baik', NULL, 91.30, 'Median barrier beton New Jersey, L=100m'),
  ('d1000000-0000-0000-0000-000000000001', 'Pembatas Jalan', 3.6000, 98.6545, 'Rusak Ringan', NULL, 87.80, 'Delineator post hilang 5 unit'),
  ('d1000000-0000-0000-0000-000000000001', 'Pembatas Jalan', 3.6040, 98.6300, 'Rusak Berat', NULL, 96.10, 'Median barrier retak akibat tumbukan truk');


-- =============================================
-- 5. ROAD SEGMENTS TAMBAHAN: BAKAUHENI - TERBANGGI BESAR 
-- (Ekspansi dari 3 segmen → 20 segmen, Km 0-1 s/d Km 19-20)
-- =============================================
-- Note: Segmen Km 0-1, Km 1-2, Km 2-3 sudah ada di seed awal (b4000000..001-003)
-- Tambahkan Km 3-4 s/d Km 19-20
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b4000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000005', 'Km 3-4'),
  ('b4000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'Km 4-5'),
  ('b4000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005', 'Km 5-6'),
  ('b4000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000005', 'Km 6-7'),
  ('b4000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000005', 'Km 7-8'),
  ('b4000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000005', 'Km 8-9'),
  ('b4000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000005', 'Km 9-10'),
  ('b4000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000005', 'Km 10-11'),
  ('b4000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000005', 'Km 11-12'),
  ('b4000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000005', 'Km 12-13'),
  ('b4000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000005', 'Km 13-14'),
  ('b4000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000005', 'Km 14-15'),
  ('b4000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000005', 'Km 15-16'),
  ('b4000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005', 'Km 16-17'),
  ('b4000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005', 'Km 17-18'),
  ('b4000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000005', 'Km 18-19'),
  ('b4000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005', 'Km 19-20')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. DAMAGE REPORTS TAMBAHAN: BAKAUHENI - TERBANGGI BESAR (55 Laporan)
-- Koordinat realistis: Bakauheni (-5.8678, 105.7511) → Terbanggi Besar (-4.8346, 105.2833)
-- =============================================
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  -- Km 3-4
  ('b4000000-0000-0000-0000-000000000004', 'Retak Memanjang', 'Sedang', -5.7200, 105.6500, 250.30, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.40),
  ('b4000000-0000-0000-0000-000000000004', 'Lubang', 'Parah', -5.7180, 105.6480, 580.70, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.20),
  ('b4000000-0000-0000-0000-000000000004', 'Retak Buaya', 'Ringan', -5.7160, 105.6460, 820.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.60),
  -- Km 4-5
  ('b4000000-0000-0000-0000-000000000005', 'Retak Melintang', 'Parah', -5.7140, 105.6440, 180.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.80),
  ('b4000000-0000-0000-0000-000000000005', 'Lubang', 'Sedang', -5.7120, 105.6420, 450.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.30),
  ('b4000000-0000-0000-0000-000000000005', 'Retak Memanjang', 'Ringan', -5.7100, 105.6400, 720.80, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.90),
  -- Km 5-6
  ('b4000000-0000-0000-0000-000000000006', 'Retak Buaya', 'Sedang', -5.7080, 105.6380, 200.50, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.70),
  ('b4000000-0000-0000-0000-000000000006', 'Lubang', 'Parah', -5.7060, 105.6360, 550.20, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.10),
  ('b4000000-0000-0000-0000-000000000006', 'Retak Memanjang', 'Ringan', -5.7040, 105.6340, 880.60, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.40),
  -- Km 6-7
  ('b4000000-0000-0000-0000-000000000007', 'Retak Melintang', 'Parah', -5.7020, 105.6320, 150.80, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.50),
  ('b4000000-0000-0000-0000-000000000007', 'Retak Memanjang', 'Sedang', -5.7000, 105.6300, 480.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.20),
  -- Km 7-8
  ('b4000000-0000-0000-0000-000000000008', 'Lubang', 'Ringan', -5.6980, 105.6280, 220.60, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.30),
  ('b4000000-0000-0000-0000-000000000008', 'Retak Buaya', 'Parah', -5.6960, 105.6260, 560.30, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.80),
  ('b4000000-0000-0000-0000-000000000008', 'Retak Melintang', 'Sedang', -5.6940, 105.6240, 830.50, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.10),
  -- Km 8-9
  ('b4000000-0000-0000-0000-000000000009', 'Retak Memanjang', 'Parah', -5.6920, 105.6220, 180.40, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.60),
  ('b4000000-0000-0000-0000-000000000009', 'Lubang', 'Sedang', -5.6900, 105.6200, 520.80, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.40),
  -- Km 9-10
  ('b4000000-0000-0000-0000-000000000010', 'Retak Buaya', 'Ringan', -5.6880, 105.6180, 160.30, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.20),
  ('b4000000-0000-0000-0000-000000000010', 'Retak Melintang', 'Parah', -5.6860, 105.6160, 490.70, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.30),
  ('b4000000-0000-0000-0000-000000000010', 'Lubang', 'Sedang', -5.6840, 105.6140, 780.50, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.50),
  -- Km 10-11
  ('b4000000-0000-0000-0000-000000000011', 'Retak Memanjang', 'Sedang', -5.6820, 105.6120, 250.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.80),
  ('b4000000-0000-0000-0000-000000000011', 'Retak Buaya', 'Parah', -5.6800, 105.6100, 620.30, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.40),
  -- Km 11-12
  ('b4000000-0000-0000-0000-000000000012', 'Lubang', 'Ringan', -5.6780, 105.6080, 180.80, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.50),
  ('b4000000-0000-0000-0000-000000000012', 'Retak Melintang', 'Sedang', -5.6760, 105.6060, 520.40, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.70),
  ('b4000000-0000-0000-0000-000000000012', 'Retak Memanjang', 'Parah', -5.6740, 105.6040, 850.60, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.20),
  -- Km 12-13
  ('b4000000-0000-0000-0000-000000000013', 'Retak Buaya', 'Sedang', -5.6720, 105.6020, 200.30, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.50),
  ('b4000000-0000-0000-0000-000000000013', 'Lubang', 'Parah', -5.6700, 105.6000, 580.70, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.90),
  -- Km 13-14
  ('b4000000-0000-0000-0000-000000000014', 'Retak Memanjang', 'Ringan', -5.6680, 105.5980, 150.40, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.80),
  ('b4000000-0000-0000-0000-000000000014', 'Retak Melintang', 'Parah', -5.6660, 105.5960, 460.80, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.60),
  ('b4000000-0000-0000-0000-000000000014', 'Lubang', 'Sedang', -5.6640, 105.5940, 780.50, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.30),
  -- Km 14-15
  ('b4000000-0000-0000-0000-000000000015', 'Retak Buaya', 'Parah', -5.6620, 105.5920, 220.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.10),
  ('b4000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Sedang', -5.6600, 105.5900, 550.40, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.40),
  -- Km 15-16
  ('b4000000-0000-0000-0000-000000000016', 'Lubang', 'Ringan', -5.6580, 105.5880, 180.30, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.90),
  ('b4000000-0000-0000-0000-000000000016', 'Retak Melintang', 'Parah', -5.6560, 105.5860, 510.80, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.30),
  -- Km 16-17
  ('b4000000-0000-0000-0000-000000000017', 'Retak Buaya', 'Sedang', -5.6540, 105.5840, 200.50, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.80),
  ('b4000000-0000-0000-0000-000000000017', 'Retak Memanjang', 'Parah', -5.6520, 105.5820, 620.30, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.50),
  ('b4000000-0000-0000-0000-000000000017', 'Lubang', 'Ringan', -5.6500, 105.5800, 880.60, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.70),
  -- Km 17-18
  ('b4000000-0000-0000-0000-000000000018', 'Retak Melintang', 'Sedang', -5.6480, 105.5780, 150.80, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.60),
  ('b4000000-0000-0000-0000-000000000018', 'Lubang', 'Parah', -5.6460, 105.5760, 490.40, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.30),
  -- Km 18-19
  ('b4000000-0000-0000-0000-000000000019', 'Retak Memanjang', 'Ringan', -5.6440, 105.5740, 220.60, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.40),
  ('b4000000-0000-0000-0000-000000000019', 'Retak Buaya', 'Parah', -5.6420, 105.5720, 560.30, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.90),
  ('b4000000-0000-0000-0000-000000000019', 'Lubang', 'Sedang', -5.6400, 105.5700, 850.80, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.20),
  -- Km 19-20 (Area menuju Terbanggi Besar)
  ('b4000000-0000-0000-0000-000000000020', 'Retak Melintang', 'Parah', -5.6380, 105.5680, 180.40, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.70),
  ('b4000000-0000-0000-0000-000000000020', 'Retak Memanjang', 'Sedang', -5.6360, 105.5660, 520.70, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.30),
  ('b4000000-0000-0000-0000-000000000020', 'Lubang', 'Ringan', -5.6340, 105.5640, 870.30, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.10);

-- =============================================
-- 7. TOLL ASSETS: BAKAUHENI - TERBANGGI BESAR (30 Aset)
-- =============================================
INSERT INTO toll_assets (toll_road_id, asset_type, lat, lng, condition, image_url, ai_confidence, notes) VALUES
  -- Lampu Jalan
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.8600, 105.7450, 'Baik', NULL, 94.20, 'Lampu PJU 200W LED tinggi, tiang 12m'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.7800, 105.6800, 'Rusak Ringan', NULL, 87.60, 'Lampu berkedip intermiten'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.7200, 105.6500, 'Baik', NULL, 92.80, 'Lampu solar cell 120W'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.6800, 105.6100, 'Rusak Berat', NULL, 96.40, 'Tiang patah akibat pohon tumbang'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.6400, 105.5700, 'Baik', NULL, 90.50, 'Lampu PJU 150W LED baru diganti 2024'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.8200, 105.7200, 'Rusak Ringan', NULL, 88.30, 'Sensor cahaya senja rusak'),
  ('a1000000-0000-0000-0000-000000000005', 'Lampu Jalan', -5.7500, 105.6650, 'Baik', NULL, 93.70, 'Lampu PJU dual-arm 100W'),
  -- Guardrail
  ('a1000000-0000-0000-0000-000000000005', 'Guardrail', -5.8500, 105.7400, 'Baik', NULL, 95.10, 'Guardrail W-beam galvanis hot-dip, L=100m'),
  ('a1000000-0000-0000-0000-000000000005', 'Guardrail', -5.7600, 105.6700, 'Rusak Berat', NULL, 97.20, 'Guardrail rusak parah di tikungan, bekas kecelakaan truk'),
  ('a1000000-0000-0000-0000-000000000005', 'Guardrail', -5.7000, 105.6300, 'Rusak Ringan', NULL, 89.80, 'Cat guardrail terkelupas, baut longgar'),
  ('a1000000-0000-0000-0000-000000000005', 'Guardrail', -5.6600, 105.5900, 'Baik', NULL, 93.40, 'Guardrail baru dipasang 2024-Q2'),
  ('a1000000-0000-0000-0000-000000000005', 'Guardrail', -5.8000, 105.7000, 'Rusak Ringan', NULL, 86.90, 'Guardrail miring 5° dari posisi normal'),
  -- Plang/Rambu
  ('a1000000-0000-0000-0000-000000000005', 'Plang/Rambu', -5.8650, 105.7480, 'Baik', NULL, 94.60, 'Rambu entrance Bakauheni'),
  ('a1000000-0000-0000-0000-000000000005', 'Plang/Rambu', -5.7900, 105.6900, 'Rusak Ringan', NULL, 88.20, 'Rambu jarak km rusak reflektifnya'),
  ('a1000000-0000-0000-0000-000000000005', 'Plang/Rambu', -5.7300, 105.6400, 'Rusak Berat', NULL, 96.80, 'Rambu informasi rest area jatuh ke bahu jalan'),
  ('a1000000-0000-0000-0000-000000000005', 'Plang/Rambu', -5.6700, 105.6000, 'Baik', NULL, 91.50, 'Rambu batas kecepatan 100 km/h'),
  ('a1000000-0000-0000-0000-000000000005', 'Plang/Rambu', -5.8300, 105.7100, 'Baik', NULL, 93.10, 'Gantry sign overhead, info jalur'),
  -- CCTV
  ('a1000000-0000-0000-0000-000000000005', 'CCTV', -5.8670, 105.7505, 'Baik', NULL, 95.30, 'CCTV PTZ 360° connected ke TMC Lampung'),
  ('a1000000-0000-0000-0000-000000000005', 'CCTV', -5.7700, 105.6750, 'Rusak Ringan', NULL, 89.10, 'CCTV fixed, lensa kotor'),
  ('a1000000-0000-0000-0000-000000000005', 'CCTV', -5.7100, 105.6200, 'Baik', NULL, 92.40, 'CCTV speed detection, dual camera'),
  ('a1000000-0000-0000-0000-000000000005', 'CCTV', -5.6500, 105.5800, 'Rusak Berat', NULL, 97.50, 'CCTV dan housing rusak akibat petir'),
  ('a1000000-0000-0000-0000-000000000005', 'CCTV', -5.8100, 105.7050, 'Baik', NULL, 91.80, 'CCTV PTZ backup, resolusi 2K'),
  -- Gantry Tol
  ('a1000000-0000-0000-0000-000000000005', 'Gantry Tol', -5.8678, 105.7511, 'Baik', NULL, 94.90, 'Gantry masuk Tol Bakauheni, 6 lane'),
  ('a1000000-0000-0000-0000-000000000005', 'Gantry Tol', -5.7400, 105.6550, 'Rusak Ringan', NULL, 88.60, 'Gantry tengah, 1 dari 4 sensor DSRC error'),
  ('a1000000-0000-0000-0000-000000000005', 'Gantry Tol', -5.6350, 105.5650, 'Baik', NULL, 93.20, 'Gantry exit menuju Terbanggi Besar'),
  -- Pembatas Jalan
  ('a1000000-0000-0000-0000-000000000005', 'Pembatas Jalan', -5.8400, 105.7350, 'Baik', NULL, 92.60, 'Median barrier beton precast, L=200m'),
  ('a1000000-0000-0000-0000-000000000005', 'Pembatas Jalan', -5.7400, 105.6600, 'Rusak Ringan', NULL, 87.40, 'Delineator post hilang 12 unit sepanjang 2 km'),
  ('a1000000-0000-0000-0000-000000000005', 'Pembatas Jalan', -5.6900, 105.6150, 'Rusak Berat', NULL, 96.70, 'Median barrier retak & bergeser 30cm dari posisi'),
  ('a1000000-0000-0000-0000-000000000005', 'Pembatas Jalan', -5.6300, 105.5650, 'Baik', NULL, 91.90, 'Rumble strip & median terkelola baik'),
  -- Lainnya
  ('a1000000-0000-0000-0000-000000000005', 'Lainnya', -5.7500, 105.6650, 'Baik', NULL, 90.30, 'Rest Area KM 72 — fasilitas lengkap');

-- =============================================
-- SELESAI! Data MedBin & BakTer telah dimuat.
-- =============================================
