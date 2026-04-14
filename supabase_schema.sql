-- =============================================
-- AI-TOLL ROAD MONITORING DASHBOARD
-- Supabase Database Schema & Seed Data
-- =============================================
-- INSTRUKSI: Copy-paste SELURUH script ini ke SQL Editor di Supabase
-- Buka: https://supabase.com → Project Anda → SQL Editor → New Query → Paste → Run
-- =============================================

-- =============================================
-- STEP 1: BUAT TABEL-TABEL
-- =============================================

-- 1. TOLL ROADS TABLE (Data Ruas Tol)
CREATE TABLE IF NOT EXISTS toll_roads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  total_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  condition_good_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ROAD SEGMENTS TABLE (Segmen per Kilometer)
CREATE TABLE IF NOT EXISTS road_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toll_road_id UUID NOT NULL REFERENCES toll_roads(id) ON DELETE CASCADE,
  segment_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DAMAGE REPORTS TABLE (Laporan Kerusakan + AI Detection)
CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES road_segments(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL CHECK (damage_type IN ('Retak Memanjang','Retak Melintang','Retak Buaya','Lubang')),
  severity TEXT NOT NULL CHECK (severity IN ('Ringan','Sedang','Parah')),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  distance_meter NUMERIC(8,2) NOT NULL DEFAULT 0,
  quarter_period TEXT NOT NULL,
  image_url TEXT,
  ai_confidence NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STEP 2: BUAT INDEX UNTUK PERFORMA QUERY
-- =============================================
CREATE INDEX IF NOT EXISTS idx_road_segments_toll_road ON road_segments(toll_road_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_segment ON damage_reports(segment_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_quarter ON damage_reports(quarter_period);

-- =============================================
-- STEP 3: AKTIFKAN ROW LEVEL SECURITY (RLS)
-- Ini WAJIB agar data bisa diakses dari frontend via anon key
-- =============================================

-- Aktifkan RLS pada semua tabel
ALTER TABLE toll_roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Izinkan SEMUA user (termasuk anonim) untuk SELECT (baca data)
CREATE POLICY "Allow public read toll_roads"
  ON toll_roads FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read road_segments"
  ON road_segments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read damage_reports"
  ON damage_reports FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Hanya authenticated users yang boleh INSERT/UPDATE/DELETE
CREATE POLICY "Allow authenticated insert toll_roads"
  ON toll_roads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update toll_roads"
  ON toll_roads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete toll_roads"
  ON toll_roads FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert road_segments"
  ON road_segments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update road_segments"
  ON road_segments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete road_segments"
  ON road_segments FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert damage_reports"
  ON damage_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update damage_reports"
  ON damage_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete damage_reports"
  ON damage_reports FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- STEP 4: MASUKKAN SEED DATA (Contoh Data)
-- =============================================

-- Toll Roads
INSERT INTO toll_roads (id, name, region, total_km, condition_good_percentage) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Jalan Tol Lingkar Luar Jakarta (JORR)', 'Jakarta', 65.00, 91.00),
  ('a1000000-0000-0000-0000-000000000002', 'Tol Jagorawi', 'Jakarta', 46.00, 88.50),
  ('a1000000-0000-0000-0000-000000000003', 'Tol Cikampek - Purwakarta - Padalarang', 'Jakarta', 58.00, 85.20),
  ('a1000000-0000-0000-0000-000000000004', 'Tol Terbanggi Besar - Kayu Agung', 'Trans Sumatera', 189.00, 93.10),
  ('a1000000-0000-0000-0000-000000000005', 'Tol Bakauheni - Terbanggi Besar', 'Trans Sumatera', 140.90, 94.50),
  ('a1000000-0000-0000-0000-000000000006', 'Tol Pekanbaru - Dumai', 'Trans Sumatera', 131.00, 90.80);

-- Road Segments for JORR
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Km 0-1'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Km 1-2'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Km 2-3'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Km 3-4'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Km 4-5');

-- Road Segments for Tol Jagorawi
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Km 0-1'),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Km 1-2'),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Km 2-3');

-- Road Segments for Tol Terbanggi - Kayu Agung
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'Km 0-1'),
  ('b3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'Km 1-2'),
  ('b3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'Km 2-3'),
  ('b3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'Km 3-4');

-- Road Segments for Tol Bakauheni - Terbanggi
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b4000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'Km 0-1'),
  ('b4000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'Km 1-2'),
  ('b4000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'Km 2-3');

-- Road Segments for Tol Pekanbaru - Dumai
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b5000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'Km 0-1'),
  ('b5000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'Km 1-2');

-- Road Segments for Tol Cikampek
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES
  ('b6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Km 0-1'),
  ('b6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'Km 1-2'),
  ('b6000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'Km 2-3');

-- Damage Reports for JORR segments
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Retak Memanjang', 'Ringan', -6.2850, 106.8450, 150.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.50),
  ('b1000000-0000-0000-0000-000000000001', 'Lubang', 'Parah', -6.2855, 106.8455, 320.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.80),
  ('b1000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Sedang', -6.2860, 106.8460, 480.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.30),
  ('b1000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Ringan', -6.2870, 106.8470, 850.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.20),
  ('b1000000-0000-0000-0000-000000000002', 'Lubang', 'Sedang', -6.2875, 106.8475, 920.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.60),
  ('b1000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Parah', -6.2880, 106.8480, 200.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.10),
  ('b1000000-0000-0000-0000-000000000003', 'Retak Memanjang', 'Sedang', -6.2885, 106.8485, 550.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.70),
  ('b1000000-0000-0000-0000-000000000004', 'Lubang', 'Ringan', -6.2890, 106.8490, 100.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.40),
  ('b1000000-0000-0000-0000-000000000004', 'Retak Melintang', 'Parah', -6.2895, 106.8495, 700.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.20),
  ('b1000000-0000-0000-0000-000000000005', 'Retak Buaya', 'Sedang', -6.2900, 106.8500, 350.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.90);

-- Damage Reports for Jagorawi
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Retak Memanjang', 'Sedang', -6.3050, 106.8600, 250.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.00),
  ('b2000000-0000-0000-0000-000000000001', 'Lubang', 'Parah', -6.3055, 106.8605, 600.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.30),
  ('b2000000-0000-0000-0000-000000000002', 'Retak Buaya', 'Ringan', -6.3060, 106.8610, 400.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.50),
  ('b2000000-0000-0000-0000-000000000003', 'Retak Melintang', 'Sedang', -6.3070, 106.8620, 780.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.80);

-- Damage Reports for Terbanggi - Kayu Agung
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'Lubang', 'Sedang', -4.5100, 105.2600, 120.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.10),
  ('b3000000-0000-0000-0000-000000000002', 'Retak Memanjang', 'Ringan', -4.5200, 105.2700, 500.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.20),
  ('b3000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Parah', -4.5300, 105.2800, 900.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.00),
  ('b3000000-0000-0000-0000-000000000004', 'Retak Melintang', 'Sedang', -4.5400, 105.2900, 300.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.50);

-- Damage Reports for Bakauheni - Terbanggi
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b4000000-0000-0000-0000-000000000001', 'Retak Memanjang', 'Ringan', -5.5000, 105.1000, 200.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.00),
  ('b4000000-0000-0000-0000-000000000002', 'Lubang', 'Sedang', -5.5100, 105.1100, 650.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.70),
  ('b4000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Parah', -5.5200, 105.1200, 880.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.40);

-- Damage Reports for Pekanbaru - Dumai
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b5000000-0000-0000-0000-000000000001', 'Retak Melintang', 'Sedang', 1.4800, 101.4000, 300.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.50),
  ('b5000000-0000-0000-0000-000000000002', 'Lubang', 'Parah', 1.4900, 101.4100, 750.00, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.80);

-- Damage Reports for Cikampek
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES
  ('b6000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Sedang', -6.4200, 107.0500, 180.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.10),
  ('b6000000-0000-0000-0000-000000000002', 'Retak Memanjang', 'Ringan', -6.4300, 107.0600, 420.00, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.90),
  ('b6000000-0000-0000-0000-000000000003', 'Lubang', 'Parah', -6.4400, 107.0700, 670.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 98.20);

-- =============================================
-- STEP 5: (OPSIONAL) BUAT STORAGE BUCKET UNTUK FOTO
-- Jalankan script ini secara TERPISAH jika ingin upload foto ke Supabase Storage
-- =============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('damage-photos', 'damage-photos', true);
-- CREATE POLICY "Allow public read damage-photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'damage-photos');
-- CREATE POLICY "Allow authenticated upload damage-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'damage-photos');

-- =============================================
-- SELESAI! Setelah RUN, lanjutkan ke langkah berikutnya di panduan.
-- =============================================
