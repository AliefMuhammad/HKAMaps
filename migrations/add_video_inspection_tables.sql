-- ============================================================
-- HKA MAPS — Video Inspection Pipeline Tables
-- INSTRUKSI: Jalankan di Supabase SQL Editor
-- Tidak merusak tabel existing (toll_roads, damage_reports, toll_assets, scan_sessions)
-- ============================================================

-- 1. INSPECTION SESSIONS
--    Lebih lengkap dari scan_sessions; scan_sessions dipertahankan untuk backward compat.
CREATE TABLE IF NOT EXISTS inspection_sessions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type       TEXT NOT NULL DEFAULT 'camera_capture'
                    CHECK (source_type IN ('image_upload','camera_capture','video_upload','realtime')),
  toll_road_id      UUID REFERENCES toll_roads(id) ON DELETE SET NULL,
  inspector_name    TEXT,
  device_info       TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','completed','failed')),
  started_at        TIMESTAMPTZ DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  total_frames      INT DEFAULT 0,
  total_detections  INT DEFAULT 0,
  total_events      INT DEFAULT 0,
  route_geometry    JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 2. INSPECTION IMAGES
--    One row per sampled video frame (or uploaded image) that had detections.
CREATE TABLE IF NOT EXISTS inspection_images (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id               UUID REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  original_image_url       TEXT,
  annotated_image_url      TEXT,
  latitude                 NUMERIC(10,7),
  longitude                NUMERIC(10,7),
  location_status          TEXT DEFAULT 'missing'
                           CHECK (location_status IN ('gps','manual_input','approximate','missing')),
  timestamp                TIMESTAMPTZ DEFAULT now(),
  frame_index              INT DEFAULT 0,
  video_timestamp_second   NUMERIC(10,3) DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- 3. DETECTIONS
--    Normalised detection records.  Links to both inspection_images AND
--    legacy damage_reports / toll_assets via optional foreign keys.
CREATE TABLE IF NOT EXISTS detections (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id             UUID REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  image_id               UUID REFERENCES inspection_images(id) ON DELETE CASCADE,
  category               TEXT NOT NULL CHECK (category IN ('asset','road_defect')),
  class_name             TEXT NOT NULL,
  confidence             NUMERIC(5,4) NOT NULL,
  bbox_x1                NUMERIC(8,2),
  bbox_y1                NUMERIC(8,2),
  bbox_x2                NUMERIC(8,2),
  bbox_y2                NUMERIC(8,2),
  mask_polygon_json      JSONB,
  severity               TEXT CHECK (severity IN ('low','medium','high')),
  latitude               NUMERIC(10,7),
  longitude              NUMERIC(10,7),
  location_status        TEXT DEFAULT 'missing'
                         CHECK (location_status IN ('gps','manual_input','approximate','missing')),
  status                 TEXT NOT NULL DEFAULT 'detected'
                         CHECK (status IN ('detected','verified','false_positive','resolved')),
  video_timestamp_second NUMERIC(10,3) DEFAULT 0,
  frame_index            INT DEFAULT 0,
  -- Optional link to legacy tables (populated if saved to legacy tables as well)
  damage_report_id       UUID REFERENCES damage_reports(id) ON DELETE SET NULL,
  toll_asset_id          UUID REFERENCES toll_assets(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- 4. DETECTION EVENTS
--    One row per unique physical defect/asset after duplicate filtering.
CREATE TABLE IF NOT EXISTS detection_events (
  id                               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id                       UUID REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  class_name                       TEXT NOT NULL,
  category                         TEXT NOT NULL CHECK (category IN ('asset','road_defect')),
  best_confidence                  NUMERIC(5,4),
  severity                         TEXT CHECK (severity IN ('low','medium','high')),
  first_seen_video_second          NUMERIC(10,3),
  last_seen_video_second           NUMERIC(10,3),
  first_seen_frame                 INT,
  last_seen_frame                  INT,
  representative_annotated_image_url TEXT,
  detection_count                  INT DEFAULT 1,
  latitude                         NUMERIC(10,7),
  longitude                        NUMERIC(10,7),
  location_status                  TEXT DEFAULT 'missing'
                                   CHECK (location_status IN ('gps','manual_input','approximate','missing')),
  status                           TEXT NOT NULL DEFAULT 'detected'
                                   CHECK (status IN ('detected','verified','false_positive','resolved')),
  created_at                       TIMESTAMPTZ DEFAULT now(),
  updated_at                       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inspection_images_session ON inspection_images(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_session        ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_image          ON detections(image_id);
CREATE INDEX IF NOT EXISTS idx_detections_class          ON detections(class_name);
CREATE INDEX IF NOT EXISTS idx_detection_events_session  ON detection_events(session_id);
CREATE INDEX IF NOT EXISTS idx_detection_events_class    ON detection_events(class_name);
-- Spatial search by lat/lng
CREATE INDEX IF NOT EXISTS idx_detections_latlon         ON detections(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detection_events_latlon   ON detection_events(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_events    ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public_read_inspection_sessions"
  ON inspection_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_inspection_images"
  ON inspection_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_detections"
  ON detections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_detection_events"
  ON detection_events FOR SELECT TO anon, authenticated USING (true);

-- Anon insert (scanner without auth)
CREATE POLICY "anon_insert_inspection_sessions"
  ON inspection_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_insert_inspection_images"
  ON inspection_images FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_insert_detections"
  ON detections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_insert_detection_events"
  ON detection_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Update for status changes
CREATE POLICY "anon_update_inspection_sessions"
  ON inspection_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_update_detections"
  ON detections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_update_detection_events"
  ON detection_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- HELPER: updated_at trigger for detection_events
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_detection_events_updated_at ON detection_events;
CREATE TRIGGER trg_detection_events_updated_at
  BEFORE UPDATE ON detection_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
