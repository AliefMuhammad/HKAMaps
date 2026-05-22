-- ============================================================
-- Migration 001: road_findings table
-- Date: 2026-05-11
-- Description: New additive table for CV-detected road findings.
--   DOES NOT modify any existing tables (toll_roads, road_segments,
--   damage_reports, toll_assets, inspection_sessions, detections, etc.)
--
-- JICA AMS / e-SPM schema fields:
--   finding_id, asset_id, toll_road_id, segment_id, direction, lane,
--   chainage_km, latitude, longitude, damage_type, severity,
--   confidence_score, bbox, mask, estimated_area, estimated_length,
--   detected_at, status, recommended_action, spm_indicator
-- ============================================================

-- Enable UUID generation (may already be enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Main findings table
-- ============================================================
CREATE TABLE IF NOT EXISTS road_findings (
    -- Identity
    finding_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Asset linkage (nullable — not all detections have a paired asset)
    asset_id            UUID        REFERENCES toll_assets(id) ON DELETE SET NULL,

    -- Road linkage
    toll_road_id        UUID        REFERENCES toll_roads(id) ON DELETE SET NULL,
    segment_id          UUID        REFERENCES road_segments(id) ON DELETE SET NULL,

    -- Inspection context
    session_id          TEXT,
    direction           TEXT        CHECK (direction IN ('A', 'B', 'AB', NULL)),
    lane                TEXT,       -- 'L1', 'L2', 'L3', 'bahu kiri', 'bahu kanan', etc.
    chainage_km         NUMERIC(10, 3),

    -- Geolocation
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,

    -- Damage classification
    damage_type         TEXT        NOT NULL,  -- canonical class name, e.g. 'pothole'
    damage_type_label   TEXT,                  -- Indonesian label, e.g. 'Lubang'
    severity            TEXT        CHECK (severity IN ('low', 'medium', 'high')),
    confidence_score    NUMERIC(5, 4)  CHECK (confidence_score BETWEEN 0 AND 1),

    -- Ensemble metadata
    ensemble_sources    TEXT[],                -- e.g. ARRAY['obb','hf_defect']

    -- Geometry
    bbox                JSONB,                 -- {"x1":…, "y1":…, "x2":…, "y2":…} in pixels
    mask_polygon        JSONB,                 -- [[x,y],…] or null

    -- Measurement (pixel-based — real-world dims require camera calibration)
    estimated_area_px   NUMERIC(14, 2),
    estimated_length_px NUMERIC(12, 2),
    estimated_width_px  NUMERIC(12, 2),

    -- JICA SPM / AMS fields
    spm_indicator       TEXT,                  -- e.g. 'C-4'
    spm_name            TEXT,                  -- e.g. 'Lubang'
    recommended_action  TEXT,
    deterioration_flag  TEXT        CHECK (deterioration_flag IN ('rapid','moderate','slow','stable', NULL)),

    -- Image references (relative paths or Supabase Storage URLs)
    annotated_image_url TEXT,
    original_image_url  TEXT,

    -- Lifecycle
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status              TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'verified', 'resolved')),
    notes               TEXT,

    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

-- Map rendering: fetch by toll road + has coordinates
CREATE INDEX IF NOT EXISTS idx_road_findings_toll_road
    ON road_findings (toll_road_id)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Segment-level performance analysis
CREATE INDEX IF NOT EXISTS idx_road_findings_segment
    ON road_findings (segment_id, detected_at DESC);

-- SPM dashboard: filter by indicator code
CREATE INDEX IF NOT EXISTS idx_road_findings_spm
    ON road_findings (spm_indicator, severity);

-- Blackspot analysis: geo lookup
CREATE INDEX IF NOT EXISTS idx_road_findings_geo
    ON road_findings (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Open high-severity dashboard
CREATE INDEX IF NOT EXISTS idx_road_findings_open_high
    ON road_findings (status, severity, detected_at DESC)
    WHERE status = 'open' AND severity = 'high';

-- Inspection session lookup
CREATE INDEX IF NOT EXISTS idx_road_findings_session
    ON road_findings (session_id, detected_at DESC);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_road_findings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_road_findings_updated_at ON road_findings;
CREATE TRIGGER trg_road_findings_updated_at
    BEFORE UPDATE ON road_findings
    FOR EACH ROW EXECUTE FUNCTION update_road_findings_updated_at();

-- ============================================================
-- Row Level Security (enable if using Supabase anon key)
-- ============================================================
ALTER TABLE road_findings ENABLE ROW LEVEL SECURITY;

-- Allow service_role (backend) full access
CREATE POLICY "service_role_all" ON road_findings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read" ON road_findings
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert their own session findings
CREATE POLICY "authenticated_insert" ON road_findings
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update status/notes on their findings
CREATE POLICY "authenticated_update_status" ON road_findings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Helpful view: findings summary per segment (for SPM dashboard)
-- ============================================================
CREATE OR REPLACE VIEW v_segment_spm_summary AS
SELECT
    f.toll_road_id,
    f.segment_id,
    f.spm_indicator,
    f.spm_name,
    COUNT(*)                                    AS finding_count,
    SUM(CASE WHEN f.severity = 'high'   THEN 1 ELSE 0 END) AS high_count,
    SUM(CASE WHEN f.severity = 'medium' THEN 1 ELSE 0 END) AS medium_count,
    SUM(CASE WHEN f.severity = 'low'    THEN 1 ELSE 0 END) AS low_count,
    SUM(CASE WHEN f.status = 'open'     THEN 1 ELSE 0 END) AS open_count,
    MAX(f.detected_at)                          AS last_detected_at,
    AVG(f.confidence_score)                     AS avg_confidence
FROM road_findings f
GROUP BY f.toll_road_id, f.segment_id, f.spm_indicator, f.spm_name;

-- ============================================================
-- Helpful view: open high-severity findings for maintenance plan
-- ============================================================
CREATE OR REPLACE VIEW v_maintenance_priority AS
SELECT
    f.finding_id,
    tr.name                     AS toll_road_name,
    rs.segment_name,
    f.chainage_km,
    f.damage_type,
    f.damage_type_label,
    f.severity,
    f.spm_indicator,
    f.recommended_action,
    f.latitude,
    f.longitude,
    f.annotated_image_url,
    f.detected_at,
    f.deterioration_flag
FROM road_findings f
LEFT JOIN toll_roads   tr ON f.toll_road_id = tr.id
LEFT JOIN road_segments rs ON f.segment_id  = rs.id
WHERE f.status IN ('open', 'in_progress')
  AND f.severity IN ('high', 'medium')
ORDER BY
    CASE f.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    CASE f.deterioration_flag WHEN 'rapid' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
    f.detected_at DESC;
