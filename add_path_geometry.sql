-- =============================================
-- MIGRATION: ADD PATH GEOMETRY
-- Tambahkan kolom koordinat dinamis untuk garis jalan
-- =============================================
-- INSTRUKSI: Copy dan jalankan seluruh query ini di Supabase SQL Editor
-- Buka: https://supabase.com/dashboard/project/dvvyxdppaxidotucpklq/sql/new

ALTER TABLE toll_roads ADD COLUMN IF NOT EXISTS path_geometry JSONB;

-- Note: Nilai jsonb ini nantinya akan berbentuk array dari titik koordinat: [[lng1, lat1], [lng2, lat2], ...]
