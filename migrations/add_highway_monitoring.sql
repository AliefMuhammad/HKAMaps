-- =============================================
-- Tabel Highway Monitoring untuk Roboflow Pipeline
-- =============================================

-- 1. Buat tabel highway_monitoring
CREATE TABLE IF NOT EXISTS highway_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  object_class TEXT NOT NULL,
  track_id INT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  session_id TEXT NOT NULL,
  image_url TEXT
);

-- 2. Buat index pada session_id dan track_id untuk mencari secara efisien
CREATE INDEX IF NOT EXISTS idx_highway_monitoring_session_track 
ON highway_monitoring(session_id, track_id);

-- 3. Aktifkan RLS dan tambahkan kebijakan
ALTER TABLE highway_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to highway_monitoring"
  ON highway_monitoring FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public read highway_monitoring"
  ON highway_monitoring FOR SELECT TO anon, authenticated USING (true);
