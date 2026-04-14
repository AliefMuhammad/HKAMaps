-- =============================================
-- AI SCANNER: ADDITIONAL TABLES & POLICIES
-- =============================================
-- INSTRUKSI: Copy-paste seluruh script ini ke Supabase SQL Editor → Run
-- =============================================

-- 1. TOLL ASSETS TABLE (Inventarisasi Aset Jalan Tol)
CREATE TABLE IF NOT EXISTS toll_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toll_road_id UUID REFERENCES toll_roads(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'Lampu Jalan', 'Pembatas Jalan', 'Plang/Rambu', 'Guardrail', 'CCTV', 'Gantry Tol', 'Lainnya'
  )),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Baik' CHECK (condition IN ('Baik', 'Rusak Ringan', 'Rusak Berat')),
  image_url TEXT,
  ai_confidence NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SCAN SESSIONS TABLE (Log Sesi Inspeksi)
CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toll_road_id UUID REFERENCES toll_roads(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL DEFAULT 'Petugas',
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  total_damages INT DEFAULT 0,
  total_assets INT DEFAULT 0,
  route_geometry JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ADD COLUMNS TO EXISTING damage_reports
ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_toll_assets_toll_road ON toll_assets(toll_road_id);
CREATE INDEX IF NOT EXISTS idx_toll_assets_type ON toll_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_toll_road ON scan_sessions(toll_road_id);

-- 5. ENABLE RLS
ALTER TABLE toll_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES — Allow public read
CREATE POLICY "Allow public read toll_assets"
  ON toll_assets FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public read scan_sessions"
  ON scan_sessions FOR SELECT TO anon, authenticated USING (true);

-- Allow anon INSERT (for scanner without auth)
CREATE POLICY "Allow anon insert toll_assets"
  ON toll_assets FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon insert scan_sessions"
  ON scan_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update scan_sessions"
  ON scan_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Allow anon INSERT on damage_reports (scanner needs this)
CREATE POLICY "Allow anon insert damage_reports"
  ON damage_reports FOR INSERT TO anon WITH CHECK (true);

-- 7. SUPABASE STORAGE BUCKET (for scan photos)
-- Note: If this fails, create the bucket manually in Supabase Dashboard → Storage → New Bucket → "scan-photos" → Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-photos', 'scan-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public uploads
CREATE POLICY "Allow public upload scan-photos"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'scan-photos');

CREATE POLICY "Allow public read scan-photos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'scan-photos');
