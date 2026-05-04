-- =============================================
-- FIX: Scanner data tidak muncul di peta
-- =============================================
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- 1. Pastikan kolom source & scanned_at ada di damage_reports
ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

-- 2. Perlonggar CHECK constraint toll_assets agar menerima semua tipe aset
--    yang dideteksi oleh YOLO-World (bahasa Inggris & Indonesia)
ALTER TABLE toll_assets DROP CONSTRAINT IF EXISTS toll_assets_asset_type_check;
ALTER TABLE toll_assets ADD CONSTRAINT toll_assets_asset_type_check CHECK (
  asset_type IN (
    -- Bahasa Indonesia (dari UI)
    'Lampu Jalan', 'Tiang Listrik', 'Pembatas Jalan', 'Plang/Rambu',
    'Rambu Arah', 'Rambu Peringatan', 'Guardrail', 'CCTV',
    'Gantry Tol', 'Billboard', 'Videotron', 'Delineator', 'Marka Jalan', 'Lainnya',
    -- Bahasa Inggris (dari YOLO-World zero-shot detection)
    'street lamp', 'power line pole', 'highway sign', 'traffic sign',
    'chevron board', 'warning sign', 'billboard', 'digital billboard',
    'guardrail', 'concrete barrier', 'cctv camera', 'toll gantry',
    'delineator', 'road marking'
  )
);

-- 3. Pastikan anon bisa INSERT ke damage_reports (untuk scanner tanpa login)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'damage_reports'
      AND policyname = 'Allow anon insert damage_reports'
  ) THEN
    CREATE POLICY "Allow anon insert damage_reports"
      ON damage_reports FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- 4. Pastikan anon bisa INSERT ke toll_assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'toll_assets'
      AND policyname = 'Allow anon insert toll_assets'
  ) THEN
    CREATE POLICY "Allow anon insert toll_assets"
      ON toll_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- 5. Pastikan anon bisa INSERT ke scan_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scan_sessions'
      AND policyname = 'Allow anon insert scan_sessions'
  ) THEN
    CREATE POLICY "Allow anon insert scan_sessions"
      ON scan_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- 6. Aktifkan Realtime untuk tabel-tabel yang dibutuhkan
-- (Wajib agar Supabase Realtime bisa stream perubahan ke frontend)
ALTER PUBLICATION supabase_realtime ADD TABLE damage_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE toll_assets;

-- 7. Verifikasi: Cek semua data yang sudah masuk dari scanner
SELECT 
  'damage_reports' as tabel,
  COUNT(*) as total,
  COUNT(CASE WHEN source = 'ai_scanner' THEN 1 END) as dari_scanner,
  COUNT(CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 1 END) as punya_koordinat
FROM damage_reports
UNION ALL
SELECT 
  'toll_assets' as tabel,
  COUNT(*) as total,
  COUNT(CASE WHEN scanned_at IS NOT NULL THEN 1 END) as dari_scanner,
  COUNT(CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 1 END) as punya_koordinat
FROM toll_assets;

-- =============================================
-- SELESAI! Setelah RUN, refresh halaman dashboard
-- =============================================
